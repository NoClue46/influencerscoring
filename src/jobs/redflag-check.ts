import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { TEMPLATE_COMMENTS_PROMPT, REDFLAG_PHOTO_ANALYSIS_PROMPT } from '../constants.js';
import { fetchProfile, fetchPosts, fetchComments } from '../scrape-creators/index.js';
import { askOpenai, askOpenaiText } from '../ask-openai.js';
import { sleep, chunk } from '../utils/helpers.js';
import { analyzeNicknameReputation } from '../utils/nickname-reputation.js';
import { getItemPath } from '../utils/paths.js';
import { downloadFile } from '../utils/download-file.js';
import { withJobTransition } from './with-job-transition.js';

const REDFLAG_POST_COUNT = 5;
const MIN_FOLLOWERS = 7000;
const MIN_REPUTATION_SCORE = 60;
const MIN_INCOME_LEVEL = 60;

/**
 * Red-flag check job — предварительная проверка блогера перед полным анализом.
 *
 * Шаги:
 * 1. Берёт pending-джоб из БД, ставит статус `redflag_checking_started`
 * 2. Проверка приватности аккаунта → завершение с `isPrivate: true`
 * 3. Проверка кол-ва подписчиков (< 7 000) → redflag `followers_below_10k`
 * 4. Веб-поиск репутации через OpenAI: парсит `reputation_score` и `estimated_age`
 *    - Возраст < 35 → redflag `under_35`
 *    - Репутация < 60 → redflag `low_reputation`
 * 5. Скачивание 5 постов + анализ фото через GPT Vision на уровень дохода
 *    - Средний income < 60 → redflag `low_income`
 * 6. Загрузка комментариев + анализ на шаблонные комменты + расчёт среднего ER
 * 7. Все проверки пройдены → статус `redflag_checking_finished`
 * 8. При ошибке — retry до MAX_ATTEMPTS, затем `failed`
 */
export const redflagCheckJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'pending',
        startedStatus: 'redflag_checking_started',
        finishedStatus: 'redflag_checking_finished',
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
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    isPrivate: true
                }
            });
            return;
        }

        const followers = profile.edge_followed_by?.count ?? 0;
        console.log(`[redflag-check] Followers: ${followers}`);

        if (followers < MIN_FOLLOWERS) {
            console.log(`[redflag-check] REDFLAG: followers_below_10k (${followers})`);
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    redflag: 'followers_below_10k',
                    followers
                }
            });
            return;
        }

        console.log(`[redflag-check] Checking reputation for ${job.username}`);
        const { reputationScore, estimatedAge, rawText: nicknameRawText } = await analyzeNicknameReputation(job.username);
        console.log(`[redflag-check] Reputation score: ${reputationScore}, Estimated age: ${estimatedAge}`);

        if (estimatedAge !== null && estimatedAge < 35) {
            console.log(`[redflag-check] REDFLAG: under_35_web (${estimatedAge})`);
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    redflag: 'under_35',
                    followers,
                    nicknameAnalyseRawText: nicknameRawText
                }
            });
            return;
        }

        if (reputationScore < MIN_REPUTATION_SCORE) {
            console.log(`[redflag-check] REDFLAG: low_reputation (${reputationScore})`);
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    redflag: 'low_reputation',
                    followers,
                    nicknameAnalyseRawText: nicknameRawText
                }
            });
            return;
        }

        console.log(`[redflag-check] Fetching ${REDFLAG_POST_COUNT} posts for photo analysis`);
        const posts = await fetchPosts(job.username, REDFLAG_POST_COUNT);

        if (posts.length > 0) {
            await prisma.post.createMany({
                data: posts.map((p) => ({
                    jobId: job.id,
                    postUrl: p.url,
                    downloadUrl: p.downloadUrl,
                    isVideo: p.isVideo,
                    commentCount: p.commentCount,
                    commentEr: p.isVideo && p.viewCount > 0 ? p.commentCount / p.viewCount : 0
                }))
            });
        }

        const createdPosts = await prisma.post.findMany({ where: { jobId: job.id } });
        let totalIncomeLevel = 0;
        let analyzedPhotos = 0;

        for (const post of createdPosts) {
            if (!post.downloadUrl) continue;

            const dest = getItemPath(job.username, job.id, post.id, "post.jpg");

            try {
                await downloadFile(post.downloadUrl, dest);

                await prisma.post.update({
                    where: { id: post.id },
                    data: { filepath: dest }
                });

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
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'completed',
                        redflag: 'low_income',
                        followers,
                        nicknameAnalyseRawText: nicknameRawText,
                        avgIncomeLevel
                    }
                });
                return;
            }
        }

        const allPosts = await prisma.post.findMany({ where: { jobId: job.id } });

        const allComments: string[] = [];
        let totalER = 0;
        let erCount = 0;

        const postChunks = chunk(allPosts, 3);

        for (const postBatch of postChunks) {
            const results = await Promise.all(
                postBatch.map(async (post, index) => {
                    if (index > 0) await sleep(300);
                    const comments = await fetchComments(post.postUrl);
                    return { post, comments };
                })
            );

            for (const { post, comments } of results) {
                if (comments.length > 0) {
                    await prisma.comment.createMany({
                        data: comments.map(c => ({
                            postId: post.id,
                            text: c.text
                        }))
                    });
                    allComments.push(...comments.map(c => c.text));
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
        await prisma.job.update({
            where: { id: job.id },
            data: {
                followers,
                nicknameAnalyseRawText: nicknameRawText,
                avgIncomeLevel
            }
        });
    })
);
