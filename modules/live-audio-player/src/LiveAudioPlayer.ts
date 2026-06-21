// LiveAudioPlayer — Expo native module (TS surface). The methods start /
// playPcm16 / clear / stop are defined natively as AsyncFunctions (Android
// AudioTrack, iOS AVAudioEngine) and auto-bridged by expo-modules.
// @ts-ignore - Module is exported by expo-modules-core at runtime (types vary by SDK)
import { Module } from 'expo-modules-core';

export default class LiveAudioPlayerModule extends Module {}
