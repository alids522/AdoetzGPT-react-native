// LiveAudioPlayerModule (iOS) — AVAudioEngine + AVAudioPlayerNode streaming
// 24kHz PCM16. Int16 -> Float32 (/32768) scheduled ahead for low latency
// (mirrors live_audio_player_mobile.dart's mp_audio_stream path).
import ExpoModulesCore
import AVFAudio

public class LiveAudioPlayerModule: Module {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private var started = false
  private let queue = DispatchQueue(label: "expo.liveaudioplayer")
  private var nextSampleTime: AVAudioFramePosition = 0

  public func definition() -> ModuleDefinition {
    Name("LiveAudioPlayer")

    AsyncFunction("start") { (sampleRate: Double) in
      self.startPcm(sampleRate: sampleRate)
    }

    AsyncFunction("playPcm16") { (base64: String) in
      guard let data = Data(base64Encoded: base64) else { return }
      self.playPcm16(data: data)
    }

    AsyncFunction("clear") {
      self.player.stop()
      if self.engine.isRunning { self.player.play() }
    }

    AsyncFunction("stop") {
      self.stopPcm()
    }

    OnDestroy {
      self.stopPcm()
    }
  }

  private func startPcm(sampleRate: Double) {
    stopPcm()
    do {
      let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: sampleRate, channels: 1, interleaved: false)!
      engine.attach(player)
      engine.connect(player, to: engine.mainMixerNode, format: format)
      try engine.start()
      player.play()
      nextSampleTime = AVAudioFramePosition(0)
      started = true
    } catch {
      // ignore — surfaced as silent playback
    }
  }

  private func playPcm16(data: Data) {
    guard started else { return }
    let frameCount = AVAudioFrameCount(data.count / 2)
    guard frameCount > 0,
          let format = player.outputFormat(forBus: 0),
          let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
    buffer.frameLength = frameCount
    data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
      guard let base = raw.baseAddress?.assumingMemoryBound(to: Int16.self) else { return }
      let channels = buffer.floatChannelData![0]
      for i in 0..<Int(frameCount) {
        channels[i] = Float(base[i]) / 32768.0
      }
    }
    let now = player.lastRenderTime ?? .zero
    let sampleTime = player.playerTime(forNodeTime: now)?.sampleTime ?? nextSampleTime
    let when = AVAudioTime(sampleTime: max(sampleTime, nextSampleTime) + AVAudioFramePosition(frameCount))
    queue.async {
      self.player.scheduleBuffer(buffer, at: when, options: [], completionHandler: nil)
    }
    nextSampleTime = max(sampleTime, nextSampleTime) + AVAudioFramePosition(frameCount)
  }

  private func stopPcm() {
    started = false
    if engine.isRunning {
      player.stop()
      engine.stop()
    }
  }
}
