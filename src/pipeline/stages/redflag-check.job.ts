import { CronJob } from 'cron';
import { db } from '@/db/index.js';
import { jobs } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { fetchProfile } from '@/instagram/scrape-creators/index.js';
import { analyzeNicknameReputation } from '@/ai/analyze-nickname-reputation.js';
import { extractAgeFromBio } from '@/ai/extract-age-from-bio.js';
import { withJobTransition } from '@/pipeline/with-job-transition.js';
import { downloadAvatar } from '@/storage/avatar.js';
import { JOB_STATUS } from '@/shared/job-status.js';

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

        if (avatarUrl) {
            try {
                await downloadAvatar(avatarUrl, job.username, job.id);
                console.log(`[redflag-check] Avatar downloaded for ${job.username}`);
            } catch (error) {
                console.warn(`[redflag-check] Failed to download avatar for ${job.username}:`, error);
            }
        }

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

        const biography = profile.biography ?? '';
        console.log(`[redflag-check] Bio: "${biography.slice(0, 100)}"`);

        const bioAge = await extractAgeFromBio(biography);
        console.log(`[redflag-check] Bio age: ${bioAge}`);

        if (bioAge !== null && bioAge < 35) {
            console.log(`[redflag-check] REDFLAG: under_35_bio (${bioAge})`);
            await db.update(jobs).set({
                status: JOB_STATUS.COMPLETED,
                redflag: 'under_35',
                followers,
                avatarUrl,
                biography: biography || null,
                bioEstimatedAge: bioAge,
            }).where(eq(jobs.id, job.id));
            return;
        }

        console.log(`[redflag-check] Checking reputation for ${job.username}`);
        const { reputationScore, estimatedAge, rawText: nicknameRawText } = await analyzeNicknameReputation(job.username, biography || undefined);
        const finalAge = bioAge ?? estimatedAge;
        console.log(`[redflag-check] Reputation score: ${reputationScore}, Estimated age: ${estimatedAge}, Final age: ${finalAge}`);

        if (finalAge !== null && finalAge < 35) {
            console.log(`[redflag-check] REDFLAG: under_35 (${finalAge})`);
            await db.update(jobs).set({
                status: JOB_STATUS.COMPLETED,
                redflag: 'under_35',
                followers,
                avatarUrl,
                nicknameAnalyseRawText: nicknameRawText,
                biography: biography || null,
                bioEstimatedAge: bioAge,
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
                nicknameAnalyseRawText: nicknameRawText,
                biography: biography || null,
                bioEstimatedAge: bioAge,
            }).where(eq(jobs.id, job.id));
            return;
        }

        console.log(`[redflag-check] All checks passed for ${job.username}`);
        await db.update(jobs).set({
            followers,
            avatarUrl,
            nicknameAnalyseRawText: nicknameRawText,
            biography: biography || null,
            bioEstimatedAge: bioAge,
        }).where(eq(jobs.id, job.id));
    })
);
