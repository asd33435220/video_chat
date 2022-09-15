interface SocketOption {
    event: string;
    data?: any;
    callId?: string;
    callbackId?: string;
}

class Socket {
    constructor(port: string) {
        this.port = port;
        this.ws = new WebSocket('ws://10.12.144.36:' + port)
        this.fn = (ev: MessageEvent) => { }
    }
    port: string;
    ws: WebSocket;
    fn: (ev: MessageEvent) => void;

    setMessageCallback(messageCallback: Function) {
        this.ws.removeEventListener('message', this.fn)
        const fn = (ev: MessageEvent) => {
            try {
                const { callId } = JSON.parse(ev.data)
                // 有callId的通过注册的方式相应
                if (!callId) {
                    messageCallback(ev)
                }
            } catch (e) {
                console.log('e', e);
            }

        }
        this.fn = fn;
        this.ws.addEventListener('message', fn)
    }

    send(option: SocketOption) {
        if (this.getStatus() === this.ws.OPEN) {
            this.ws.send(JSON.stringify(option))
        }
    }

    getStatus(): number {
        return this.ws.readyState
    }

    private async listen(callId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const fn = (msg: MessageEvent) => {
                const { data, callId: responseId } = JSON.parse(msg.data)
                if (responseId === callId) {
                    this.ws.removeEventListener('message', fn)
                    resolve(data)
                }
            }
            this.ws.addEventListener('message', fn)
        })

    }

    invoke(event: string, data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const callId = Math.random().toString(36)
            this.send({ event, data, callId })
            this.listen(callId).then(data => {
                if (data === 'timeout') {
                    reject(data)
                } else {
                    resolve(data)
                }
            })
            setTimeout(() => {
                reject('timeout')
            }, 1000)
        })
    }

}

export const socket = new Socket('8010')
