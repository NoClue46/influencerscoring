import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS, NICKNAME_ANALYSIS_PROMPT, TEMPLATE_COMMENTS_PROMPT, REDFLAG_PHOTO_ANALYSIS_PROMPT } from '../constants.js';
import { fetchProfile, fetchPosts, fetchReels, fetchComments } from '../scrape-creators.js';
import { askOpenai, askOpenaiText, askOpenaiWithWebSearch } from '../ask-openai.js';
import fs from 'fs';
import path from 'path';

const REDFLAG_POST_COUNT = 5;
const REDFLAG_REEL_COUNT = 5;
const MIN_FOLLOWERS = 10000;
const MIN_REPUTATION_SCORE = 60;
const MIN_INCOME_LEVEL = 60;
const MIN_AGE_SCORE = 60;
const MIN_ER = 0.01;

export const redflagCheckJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'pending' }
    });

    if (!job) return;

    console.log(`[redflag-check] Started for job ${job.id} (${job.username})`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'redflag_checking_started' }
        });

        // === CHECK 1: Followers count ===
        console.log(`[redflag-check] Fetching profile for ${job.username}`);
        const profile = await fetchProfile(job.username, true);

        if (!profile) {
            throw new Error('Failed to fetch profile');
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

        // === CHECK 2: Internet search reputation ===
        console.log(`[redflag-check] Checking reputation for ${job.username}`);
        const nicknamePrompt = NICKNAME_ANALYSIS_PROMPT(job.username);
        const nicknameResult = await askOpenaiWithWebSearch(nicknamePrompt);

        let reputationScore = 100;
        try {
            if (nicknameResult.text) {
                const jsonMatch = nicknameResult.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    reputationScore = parsed.reputation_score ?? 100;
                }
            }
        } catch (e) {
            console.warn(`[redflag-check] Failed to parse reputation score, using default`);
        }

        console.log(`[redflag-check] Reputation score: ${reputationScore}`);

        if (reputationScore < MIN_REPUTATION_SCORE) {
            console.log(`[redflag-check] REDFLAG: low_reputation (${reputationScore})`);
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    redflag: 'low_reputation',
                    followers,
                    nicknameAnalyseRawText: nicknameResult.text
                }
            });
            return;
        }

        // === CHECK 3: Photo analysis (income_level + age) ===
        console.log(`[redflag-check] Fetching ${REDFLAG_POST_COUNT} posts for photo analysis`);
        const posts = await fetchPosts(job.username, REDFLAG_POST_COUNT);

        // Save posts to DB
        if (posts.length > 0) {
            await prisma.post.createMany({
                data: posts.map((p) => ({
                    jobId: job.id,
                    postUrl: p.url,
                    downloadUrl: p.downloadUrl,
                    isVideo: p.isVideo,
                    commentCount: p.commentCount,
                    commentRate: p.isVideo && p.viewCount > 0 ? p.commentCount / p.viewCount : 0
                }))
            });
        }

        // Download posts and analyze
        const createdPosts = await prisma.post.findMany({ where: { jobId: job.id } });
        let totalIncomeLevel = 0;
        let totalAgeScore = 0;
        let analyzedPhotos = 0;

        for (const post of createdPosts) {
            if (!post.downloadUrl) continue;

            const dest = path.join(process.env.DATA_PATH!, job.username, post.id, "post.jpg");
            const dir = path.dirname(dest);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            try {
                const response = await fetch(post.downloadUrl);
                if (!response.ok) continue;

                const buffer = Buffer.from(await response.arrayBuffer());
                fs.writeFileSync(dest, buffer);

                await prisma.post.update({
                    where: { id: post.id },
                    data: { filepath: dest }
                });

                // Analyze photo for income and age
                const analysisResult = await askOpenai([dest], REDFLAG_PHOTO_ANALYSIS_PROMPT);

                if (analysisResult.text) {
                    try {
                        const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            totalIncomeLevel += parsed.income_level?.Score ?? 50;
                            totalAgeScore += parsed.age_over_35?.Score ?? 50;
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

        if (analyzedPhotos > 0) {
            const avgIncomeLevel = totalIncomeLevel / analyzedPhotos;
            const avgAgeScore = totalAgeScore / analyzedPhotos;

            console.log(`[redflag-check] Avg income level: ${avgIncomeLevel}, Avg age score: ${avgAgeScore}`);

            if (avgIncomeLevel < MIN_INCOME_LEVEL && avgAgeScore < MIN_AGE_SCORE) {
                console.log(`[redflag-check] REDFLAG: low_income_and_age`);
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'completed',
                        redflag: 'low_income_and_age',
                        followers,
                        nicknameAnalyseRawText: nicknameResult.text
                    }
                });
                return;
            }
        }

        // === CHECK 4: Comments + ER analysis ===
        console.log(`[redflag-check] Fetching ${REDFLAG_REEL_COUNT} reels for comment analysis`);
        const reels = await fetchReels(job.username, REDFLAG_REEL_COUNT);

        // Save reels to DB
        if (reels.length > 0) {
            await prisma.reels.createMany({
                data: reels.map((r) => ({
                    jobId: job.id,
                    reelsUrl: r.url,
                    downloadUrl: r.downloadUrl,
                    commentCount: r.commentCount,
                    commentRate: r.viewCount > 0 ? r.commentCount / r.viewCount : 0
                }))
            });
        }

        // Fetch comments for posts and reels
        const allPosts = await prisma.post.findMany({ where: { jobId: job.id } });
        const allReels = await prisma.reels.findMany({ where: { jobId: job.id } });

        const allComments: string[] = [];
        let totalER = 0;
        let erCount = 0;

        for (const post of allPosts) {
            const comments = await fetchComments(post.postUrl);
            if (comments.length > 0) {
                await prisma.comment.createMany({
                    data: comments.map(c => ({
                        postId: post.id,
                        text: c.text
                    }))
                });
                allComments.push(...comments.map(c => c.text));
            }
            if (post.commentRate !== null && post.commentRate !== undefined) {
                totalER += post.commentRate;
                erCount++;
            }
        }

        for (const reel of allReels) {
            const comments = await fetchComments(reel.reelsUrl);
            if (comments.length > 0) {
                await prisma.comment.createMany({
                    data: comments.map(c => ({
                        reelsId: reel.id,
                        text: c.text
                    }))
                });
                allComments.push(...comments.map(c => c.text));
            }
            if (reel.commentRate !== null && reel.commentRate !== undefined) {
                totalER += reel.commentRate;
                erCount++;
            }
        }

        const avgER = erCount > 0 ? totalER / erCount : 0;
        console.log(`[redflag-check] Average ER: ${avgER}, Total comments: ${allComments.length}`);

        // Analyze comments for template patterns
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

        if (templateCommentsPresent && avgER < MIN_ER) {
            console.log(`[redflag-check] REDFLAG: template_comments_low_er`);
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    redflag: 'template_comments_low_er',
                    followers,
                    nicknameAnalyseRawText: nicknameResult.text
                }
            });
            return;
        }

        // All checks passed
        console.log(`[redflag-check] All checks passed for ${job.username}`);
        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'redflag_checking_finished',
                followers,
                nicknameAnalyseRawText: nicknameResult.text
            }
        });

    } catch (error) {
        const err = error as Error;
        console.error(`[redflag-check] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'pending', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});
