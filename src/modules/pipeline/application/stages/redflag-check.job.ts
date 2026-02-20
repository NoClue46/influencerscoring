import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { jobs, posts, comments } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';
import { TEMPLATE_COMMENTS_PROMPT } from '@/modules/ai/prompts/template-comments.prompt.js';
import { REDFLAG_PHOTO_ANALYSIS_PROMPT } from '@/modules/ai/prompts/redflag-photo-analysis.prompt.js';
import { fetchProfile, fetchPosts, fetchComments } from '@/modules/instagram/infra/scrape-creators/index.js';
import { askOpenai, askOpenaiText } from '@/modules/ai/infra/openai-gateway.js';
import { sleep, chunk } from '@/shared/utils/async.js';
import { analyzeNicknameReputation } from '@/modules/ai/application/analyze-nickname-reputation.js';
import { getItemPath } from '@/infra/storage/files/paths.js';
import { downloadFile } from '@/infra/storage/files/download-file.js';
import { withJobTransition } from '@/modules/pipeline/application/orchestrator/with-job-transition.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

const REDFLAG_POST_COUNT = 5;
const MIN_FOLLOWERS = 7000;
const MIN_REPUTATION_SCORE = 60;
const MIN_INCOME_LEVEL = 60;

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

        console.log(`[redflag-check] Fetching ${REDFLAG_POST_COUNT} posts for photo analysis`);
        const fetchedPosts = await fetchPosts(job.username, REDFLAG_POST_COUNT);

        if (fetchedPosts.length > 0) {
            await db.insert(posts).values(fetchedPosts.map((p) => ({
                jobId: job.id,
                postUrl: p.url,
                downloadUrl: p.downloadUrl,
                isVideo: p.isVideo,
                commentCount: p.commentCount,
                commentEr: p.isVideo && p.viewCount > 0 ? p.commentCount / p.viewCount : 0
            })));
        }

        const createdPosts = await db.select().from(posts).where(eq(posts.jobId, job.id));
        let totalIncomeLevel = 0;
        let analyzedPhotos = 0;

        for (const post of createdPosts) {
            if (!post.downloadUrl) continue;

            const dest = getItemPath(job.username, job.id, post.id, "post.jpg");

            try {
                await downloadFile(post.downloadUrl, dest);

                await db.update(posts).set({ filepath: dest }).where(eq(posts.id, post.id));

                const analysisResult = await askOpenai([dest], REDFLAG_PHOTO_ANALYSIS_PROMPT);

                if (analysisResult.text) {
                    try {
                        const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            totalIncomeLevel += parsed.income_level?.Score ?? 50;
                            analyzedPhotos++;
                        }
                    } catch (e) {
                        console.warn(`[redflag-check] Failed to parse photo analysis`);
                    }
                }
            } catch (error) {
                console.warn(`[redflag-check] Failed to download/analyze post ${post.id}`);
            }
        }

        let avgIncomeLevel: number | null = null;

        if (analyzedPhotos > 0) {
            avgIncomeLevel = totalIncomeLevel / analyzedPhotos;

            console.log(`[redflag-check] Avg income level: ${avgIncomeLevel}`);

            if (avgIncomeLevel < MIN_INCOME_LEVEL) {
                console.log(`[redflag-check] REDFLAG: low_income`);
                await db.update(jobs).set({
                    status: JOB_STATUS.COMPLETED,
                    redflag: 'low_income',
                    followers,
                    avatarUrl,
                    nicknameAnalyseRawText: nicknameRawText,
                    avgIncomeLevel
                }).where(eq(jobs.id, job.id));
                return;
            }
        }

        const allPosts = await db.select().from(posts).where(eq(posts.jobId, job.id));

        const allComments: string[] = [];
        let totalER = 0;
        let erCount = 0;

        const postChunks = chunk(allPosts, 3);

        for (const postBatch of postChunks) {
            const results = await Promise.all(
                postBatch.map(async (post, index) => {
                    if (index > 0) await sleep(300);
                    const fetchedComments = await fetchComments(post.postUrl);
                    return { post, comments: fetchedComments };
                })
            );

            for (const { post, comments: fetchedComments } of results) {
                if (fetchedComments.length > 0) {
                    await db.insert(comments).values(fetchedComments.map(c => ({
                        postId: post.id,
                        text: c.text
                    })));
                    allComments.push(...fetchedComments.map(c => c.text));
                }
                if (post.commentEr !== null && post.commentEr !== undefined) {
                    totalER += post.commentEr;
                    erCount++;
                }
            }
        }

        const avgER = erCount > 0 ? totalER / erCount : 0;
        console.log(`[redflag-check] Average ER: ${avgER}, Total comments: ${allComments.length}`);

        let templateCommentsPresent = false;

        if (allComments.length > 0) {
            const commentsText = allComments.slice(0, 50).join('\n---\n');
            const commentAnalysisPrompt = `${TEMPLATE_COMMENTS_PROMPT}\n\nComments:\n${commentsText}`;

            const commentResult = await askOpenaiText(commentAnalysisPrompt);

            if (commentResult.text) {
                try {
                    const jsonMatch = commentResult.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        templateCommentsPresent = parsed.template_comments_present === true;
                        console.log(`[redflag-check] Template comments present: ${templateCommentsPresent}`);
                    }
                } catch (e) {
                    console.warn(`[redflag-check] Failed to parse comment analysis`);
                }
            }
        }

        console.log(`[redflag-check] All checks passed for ${job.username}`);
        await db.update(jobs).set({
            followers,
            avatarUrl,
            nicknameAnalyseRawText: nicknameRawText,
            avgIncomeLevel
        }).where(eq(jobs.id, job.id));
    })
);
