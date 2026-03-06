export const JOB_STATUS = {
    PENDING: 'pending',
    REDFLAG_CHECKING_STARTED: 'redflag_checking_started',
    REDFLAG_CHECKING_FINISHED: 'redflag_checking_finished',
    FETCHING_STARTED: 'fetching_started',
    FETCHING_FINISHED: 'fetching_finished',
    DOWNLOADING_STARTED: 'downloading_started',
    DOWNLOADING_FINISHED: 'downloading_finished',
    FRAMING_STARTED: 'framing_started',
    FRAMING_FINISHED: 'framing_finished',
    SPEECH_TO_TEXT_STARTED: 'speech_to_text_started',
    SPEECH_TO_TEXT_FINISHED: 'speech_to_text_finished',
    ANALYZING_STARTED: 'analyzing_started',
    ANALYZING_FINISHED: 'analyzing_finished',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
