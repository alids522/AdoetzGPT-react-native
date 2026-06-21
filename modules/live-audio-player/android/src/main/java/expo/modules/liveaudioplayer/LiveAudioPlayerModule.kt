// LiveAudioPlayerModule (Android) — port of MainActivity.kt's AudioTrack PCM
// playback. AudioTrack MODE_STREAM, MONO, PCM_16BIT; buffer = max(min, rate/5);
// USAGE_MEDIA + CONTENT_TYPE_SPEECH.
package expo.modules.liveaudioplayer

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class LiveAudioPlayerModule : Module() {
    private var audioTrack: AudioTrack? = null
    private var executor: ExecutorService = Executors.newSingleThreadExecutor()
    private var previousAudioMode: Int? = null

    override fun definition() = ModuleDefinition {
        Name("LiveAudioPlayer")

        AsyncFunction("start") { sampleRate: Int ->
            startPcmPlayback(sampleRate)
        }

        AsyncFunction("playPcm16") { base64: String ->
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            audioTrack?.let { track ->
                executor.execute {
                    try {
                        track.write(bytes, 0, bytes.size)
                    } catch (_: Exception) {
                    }
                }
            }
        }

        AsyncFunction("clear") {
            try {
                audioTrack?.pause()
                audioTrack?.flush()
                audioTrack?.play()
            } catch (_: Exception) {
            }
        }

        AsyncFunction("stop") {
            stopPcmPlayback()
        }

        OnDestroy {
            stopPcmPlayback()
            executor.shutdownNow()
        }
    }

    private fun startPcmPlayback(sampleRate: Int) {
        stopPcmPlayback()
        if (executor.isShutdown) {
            executor = Executors.newSingleThreadExecutor()
        }
        val audioManager = reactContext.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
        if (previousAudioMode == null) {
            previousAudioMode = audioManager.mode
        }
        audioManager.mode = AudioManager.MODE_NORMAL

        val minBuffer = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        val bufferSize = maxOf(minBuffer, sampleRate / 5)
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val format = AudioFormat.Builder()
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .build()
        audioTrack = AudioTrack(
            attributes,
            format,
            bufferSize,
            AudioTrack.MODE_STREAM,
            AudioManager.AUDIO_SESSION_ID_GENERATE,
        )
        audioTrack?.play()
    }

    private fun stopPcmPlayback() {
        val track = audioTrack
        audioTrack = null
        try {
            track?.pause()
            track?.flush()
            track?.release()
        } catch (_: Exception) {
        }
        try {
            val audioManager = reactContext.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
            previousAudioMode?.let { audioManager.mode = it }
        } catch (_: Exception) {
        }
        previousAudioMode = null
    }
}
