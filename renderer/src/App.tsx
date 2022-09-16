import { useEffect, useState, useRef, useCallback } from 'react'
import './App.scss'
import { socket } from "./ws";
import { LiveStatus, LookStatus, LiveText, LookText } from "./types";
import { copyText } from "./utils";
const pc = new window.RTCPeerConnection({})
const isDebug = false
const isLog = true

function App() {
  // 别人直播间的直播间号
  const [liveCode, setLiveCode] = useState('')
  // 你的直播间的直播间号
  const [roomCode, setRoomCode] = useState('')
  const [liveStatus, setLiveStatus] = useState(LiveStatus.NOT_CONNECT)
  const [lookStatus, setLookStatus] = useState(LookStatus.NOT_CONNECT)
  const streamRef = useRef({} as MediaStream)
  const liveRef = useRef({} as HTMLVideoElement)
  const lookRef = useRef({} as HTMLVideoElement)

  useEffect(() => {
    const callback = async (ev: MessageEvent) => {
      const { data, event, code, callbackId } = JSON.parse(ev.data)
      switch (event) {
        case 'offer2answer':
          const answer = await createAnswer(data)
          socket.send({ callbackId, event, data: answer })
          break;
        case 'audienceCandidate':
          // 可选debug
          if (!isDebug) {
            const candidate = data
            addIceCandidate(candidate)
          }
          break;
        default:
          break;
      }
    }
    socket.setMessageCallback(callback)
    const fn = async (ev: RTCTrackEvent) => {
      if (isLog) {
        console.log('ev', ev.streams[0]);
      }
      lookRef.current.srcObject = ev.streams[0]
      lookRef.current.play()
      setLookStatus(LookStatus.CONNECTED)
    }
    pc.ontrack = fn
  }, [])

  useEffect(() => {
    pc.onicecandidate = (ev => {
      if (isLog) {
        console.log(ev.candidate);
      }
      setTimeout(() => {
        socket.send({ event: 'addCandidate', data: { candidate: ev.candidate, code: liveCode } })
      }, 300)
    })
  }, [liveCode])

  const handleClickLive = useCallback(async () => {
    if (liveStatus === LiveStatus.NOT_CONNECT) {
      try {
        setLiveStatus(LiveStatus.CONNECTING)
        const code: string = await socket.invoke('startLive')
        setRoomCode(code)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        liveRef.current.srcObject = stream
        if (isLog) {
          console.log('stream', stream);
        }
        liveRef.current.play()
        streamRef.current = stream
        setLiveStatus(LiveStatus.CONNECTED)
      } catch (e) {
        console.log('e',e);
        console.log('直播间创建失败');
        setLiveStatus(LiveStatus.NOT_CONNECT)
      }
    } else if (streamRef.current) {
      setRoomCode('')
      setLiveStatus(LiveStatus.NOT_CONNECT)
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      })
    }
  }, [liveStatus])



  const handleCLickLook = useCallback(async () => {
    if (lookStatus === LookStatus.NOT_CONNECT) {
      setLookStatus(LookStatus.CONNECTING)
      try {
        if (!isDebug) {
          const offer = await createOffer()
          const answer = await socket.invoke('getAnswer', { offer, code: liveCode })
          await setRemote(answer)
        }
      } catch (e) {
        console.log('e', e);
        console.log('直播间连接失败');
        setLookStatus(LookStatus.NOT_CONNECT)
      }
    } else {
      setLookStatus(LookStatus.NOT_CONNECT)
      // socket.send('stopLook', '')
    }
  }, [lookStatus, liveCode])

  async function createAnswer(offer: RTCSessionDescriptionInit | string) {
    if (typeof offer === 'string') {
      offer = JSON.parse(offer) as RTCSessionDescriptionInit
    }
    try {
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current)
      })
    } catch (e) {
      console.log('e',e);
      
    }

    await pc.setRemoteDescription(offer)
    await pc.setLocalDescription(await pc.createAnswer())
    if (isLog) {
      console.log('answer', JSON.stringify({ type: pc.localDescription?.type, sdp: pc.localDescription?.sdp }));
    }
    return { type: pc.localDescription?.type, sdp: pc.localDescription?.sdp }
  }
  async function setRemote(answer: RTCSessionDescriptionInit | string) {
    if (typeof answer === 'string') {
      answer = JSON.parse(answer) as RTCSessionDescriptionInit
    }
    await pc.setRemoteDescription(answer)
  }
  async function createOffer() {
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    if (isLog) {
      console.log('offer', JSON.stringify({ type: offer.type, sdp: offer.sdp }));
    }
    return { type: offer.type, sdp: offer.sdp }
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit | string) {
    if (typeof candidate === 'string') {
      candidate = JSON.parse(candidate) as RTCIceCandidateInit
    }
    if (candidate && pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
    if (isLog) {
      console.log('addIceCandidate', candidate);
    }
  }

  useEffect(() => {
    window.createOffer = createOffer
    window.createAnswer = createAnswer
    window.addIceCandidate = addIceCandidate
    window.setRemote = setRemote
  }, [])
  return (
    <>
      <div className="live-window">
        <video ref={liveRef} className='live-video'></video>
        <video ref={lookRef} className='look-video'></video>
      </div>
      <div className="live-sub">
        <div className="comment">

        </div>
        <div className="live-button" onClick={handleCLickLook}>
          <input placeholder='请输入对方会议号' type="tel" value={liveCode} onChange={e => {
            setLiveCode(e.target.value)
          }}
            onClick={e => {
              e.stopPropagation();
            }}
          />
          {LookText[lookStatus]}

        </div>
        <div className="live-button" onClick={handleClickLive}>
          {LiveText[liveStatus]}
          {liveStatus === LiveStatus.CONNECTED && <span onClick={(e) => {
            e.stopPropagation()
            copyText(roomCode)
          }}>
            你的会议号: {roomCode}
          </span>}
        </div>

      </div>

    </>
  )
}

export default App
