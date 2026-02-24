import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { jobs } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';
import { fetchProfile } from '@/modules/instagram/infra/scrape-creators/index.js';
import { analyzeNicknameReputation } from '@/modules/ai/application/analyze-nickname-reputation.js';
import { withJobTransition } from '@/modules/pipeline/application/orchestrator/with-job-transition.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

const MIN_FOLLOWERS = 7000;
const MIN_REPUTATION_SCORE = 60;

export const redflagCheckJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: JOB_STATUS.PENDING,
        startedStatus: JOB_STATUS.REDFLAG_CHECKING_STARTED,
        finishedStatus: JOB_STATUS.REDFLAG_CHECKING_FINISHED,
        jobName: 'redflag-check'
    }, async (job) => {
        console.log(`[redflag-check] Fetching profile for ${job.username}`);
        const profile = await fetchProfile(job.username, true);
        if (!profile) {
            throw new Error('Failed to fetch profile');
        }

        const isPrivate = profile.is_private === true;
        if (isPrivate) {
            console.log(`[redflag-check] REDFLAG: private_account`);
            await db.update(jobs).set({
                status: JOB_STATUS.COMPLETED,
                isPrivate: true
            }).where(eq(jobs.id, job.id));
            return;
        }

        const followers = profile.edge_followed_by?.count ?? 0;
        const avatarUrl = profile.profile_pic_url_hd || profile.profile_pic_url || null;
        console.log(`[redflag-check] Followers: ${followers}`);

        if (followers < MIN_FOLLOWERS) {
            console.log(`[redflag-check] REDFLAG: followers_below_10k (${followers})`);
            await db.update(jobs).set({
                status: JOB_STATUS.COMPLETED,
                redflag: 'followers_below_10k',
                followers,
                avatarUrl
            }).where(eq(jobs.id, job.id));
            return;
        }

        console.log(`[redflag-check] Checking reputation for ${job.username}`);
        const { reputationScore, estimatedAge, rawText: nicknameRawText } = await analyzeNicknameReputation(job.username);
        console.log(`[redflag-check] Reputation score: ${reputationScore}, Estimated age: ${estimatedAge}`);

        if (estimatedAge !== null && estimatedAge < 35) {
            console.log(`[redflag-check] REDFLAG: under_35_web (${estimatedAge})`);
            await db.update(jobs).set({
                status: JOB_STATUS.COMPLETED,
                redflag: 'under_35',
                followers,
                avatarUrl,
                nicknameAnalyseRawText: nicknameRawText
            }).where(eq(jobs.id, job.id));
            return;
        }

        if (reputationScore < MIN_REPUTATION_SCORE) {
            console.log(`[redflag-check] REDFLAG: low_reputation (${reputationScore})`);
            await db.update(jobs).set({
                status: JOB_STATUS.COMPLETED,
                redflag: 'low_reputation',
                followers,
                avatarUrl,
                nicknameAnalyseRawText: nicknameRawText
            }).where(eq(jobs.id, job.id));
            return;
        }

        console.log(`[redflag-check] All checks passed for ${job.username}`);
        await db.update(jobs).set({
            followers,
            avatarUrl,
            nicknameAnalyseRawText: nicknameRawText
        }).where(eq(jobs.id, job.id));
    })
);
