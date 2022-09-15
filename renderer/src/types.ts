declare global {
    interface Window {
        createOffer: Function;
        createAnswer: Function;
        addIceCandidate: Function;
        setRemote: Function;
    }
}

export enum LiveStatus {
    NOT_CONNECT = 0,
    CONNECTING = 1,
    CONNECTED = 2,
}

export enum LookStatus {
    NOT_CONNECT = 0,
    CONNECTING = 1,
    CONNECTED = 2,
}

export const LiveText = {
    [LiveStatus.NOT_CONNECT]: '开启会议',
    [LiveStatus.CONNECTING]: '会议创建中',
    [LiveStatus.CONNECTED]: '结束直播',
}

export const LookText = {
    [LookStatus.NOT_CONNECT]: '邀请加入',
    [LookStatus.CONNECTING]: '连线中',
    [LookStatus.CONNECTED]: '结束观看',
}