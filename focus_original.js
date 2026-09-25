// ==UserScript==
// @name         Skilljar Pre-Exam Focus Assistant
// @namespace    skilljar.focus.assistant
// @version      15.6.0
// @description  Focus timer with deadline, Brown Noise, 60 BPM metronome, confirmations, and external audio settings.
// @match        https://anthropic-partners.skilljar.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_notification
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window.self) {
        return;
    }

    const CONFIG = Object.freeze({
        deadline: new Date(2026, 11, 31, 23, 59, 59, 999),
        focusMinutes: 25,
        breakMinutes: 5,
        metronomeBpm: 60,
        brownNoiseVolume: 0.05,
        metronomeVolume: 0.14,
        audioMasterVolume: 0.82,
        audioScheduleAheadSeconds: 0.12,
        audioSchedulerMilliseconds: 50,
        expandedWidth: 430,
        minimizedWidth: 288,
        hostId: 'skilljar-focus-assistant-host',
        logPrefix: '[Skilljar Focus Assistant]',
        rollFallbackMs: 760,
        debug: true
    });

    const STORAGE = Object.freeze({
        minimized: 'skilljarFocusAssistantMinimized',
        timer: 'skilljarFocusAssistantTimer',
        sessions: 'skilljarFocusAssistantSessions',
        brownNoiseEnabled: 'skilljarFocusAssistantBrownNoiseEnabled',
        metronomeEnabled: 'skilljarFocusAssistantMetronomeEnabled'
    });

    const ICONS = Object.freeze({
        school: 'M5 13.18V17l7 3.82L19 17v-3.82L12 17 5 13.18zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z',
        timer: 'M15 1H9v2h6V1zm-1 13h-4v-4h4v4zm3.03-4.03.97-.97c-.43-.52-.9-.99-1.42-1.42l-.97.97A6.96 6.96 0 0 0 12 6a7 7 0 1 0 7 7c0-1.12-.27-2.18-.74-3.12l-1.23.09zM12 18a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
        event: 'M19 4h-1V2h-2v2H8V2H6v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8h16v8zm0-10H4V7a1 1 0 0 1 1-1h1v2h2V6h8v2h2V6h1a1 1 0 0 1 1 1v2z',
        book: 'M21 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14V4zm-2 13H7a2 2 0 0 0 0 2h12v-2zm0-2H7V6h12v9zM3 6H1v13a2 2 0 0 0 2 2V6z',
        play: 'M8 5v14l11-7L8 5z',
        pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
        reset: 'M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
        break: 'M18 8h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7h16v1zm0 4h1a1 1 0 0 0 0-2h-1v2zM4 9v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H4zM6 2h2v3H6V2zm4 0h2v3h-2V2zm4 0h2v3h-2V2z',
        minimize: 'M6 11h12v2H6z',
        expand: 'M7.41 14.59 12 10l4.59 4.59L18 13.17l-6-6-6 6 1.41 1.42z',
        complete: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
        cancel: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z',
        settings: 'M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a7.08 7.08 0 0 0-1.63-.94L14.87 3h-3.74l-.36 3.18c-.58.24-1.13.56-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.49 7.49 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.38 1.05.7 1.63.94l.36 3.18h3.74l.36-3.18c.58-.24 1.13-.56 1.63-.94l2.39.96 1.92-3.32-2.03-1.58zM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5z',
        noise: 'M3 10v4h4l5 5V5L7 10H3zm11.5 2a2.5 2.5 0 0 0-1.5-2.29v4.58A2.5 2.5 0 0 0 14.5 12zm-1.5-7.97v2.06a6 6 0 0 1 0 11.82v2.06a8 8 0 0 0 0-15.94z',
        metronome: 'M9 2h6l1 4H8l1-4zm-1.5 6h9L20 22H4L7.5 8zm4.5 2-2 8h4l-2-8z'
    });

    const elements = {};
    const digitStates = new WeakMap();

    let host;
    let shadow;
    let assistant;
    let alignedTimer;
    let pendingAction = null;

    let mode = 'focus';
    let running = false;
    let timerEnd = null;
    let pausedRemaining = null;
    let completedSessions = 0;

    let brownNoiseEnabled = true;
    let metronomeEnabled = true;

    let audioContext = null;
    let audioUnlocked = false;
    let audioEngineRunning = false;
    let audioMasterGain = null;
    let audioCompressor = null;
    let brownNoiseSource = null;
    let brownNoiseFilter = null;
    let brownNoiseGain = null;
    let metronomeScheduler = null;
    let nextMetronomeTime = 0;

    function log(message, details) {
        if (!CONFIG.debug) {
            return;
        }

        if (details === undefined) {
            console.log(CONFIG.logPrefix, message);
        } else {
            console.log(CONFIG.logPrefix, message, details);
        }
    }

    function warn(message, details) {
        if (details === undefined) {
            console.warn(CONFIG.logPrefix, message);
        } else {
            console.warn(CONFIG.logPrefix, message, details);
        }
    }

    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            warn('Storage read failed.', error);
            return null;
        }
    }

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            warn('Storage write failed.', error);
            return false;
        }
    }

    function readBoolean(key, fallback) {
        const value = storageGet(key);
        return value === null ? fallback : value === 'true';
    }

    function readNumber(key, fallback) {
        const value = Number(storageGet(key));
        return Number.isFinite(value) ? value : fallback;
    }

    function saveState() {
        storageSet(STORAGE.timer, JSON.stringify({
            mode,
            running,
            timerEnd,
            pausedRemaining
        }));

        storageSet(STORAGE.sessions, String(completedSessions));
        storageSet(STORAGE.brownNoiseEnabled, String(brownNoiseEnabled));
        storageSet(STORAGE.metronomeEnabled, String(metronomeEnabled));
    }

    function restoreState() {
        completedSessions = readNumber(STORAGE.sessions, 0);
        brownNoiseEnabled = readBoolean(STORAGE.brownNoiseEnabled, true);
        metronomeEnabled = readBoolean(STORAGE.metronomeEnabled, true);

        const raw = storageGet(STORAGE.timer);

        if (!raw) {
            return;
        }

        try {
            const state = JSON.parse(raw);

            if (state.mode === 'focus' || state.mode === 'break') {
                mode = state.mode;
            }

            running = Boolean(state.running);
            timerEnd = Number.isFinite(Number(state.timerEnd))
                ? Number(state.timerEnd)
                : null;

            pausedRemaining = Number.isFinite(Number(state.pausedRemaining))
                ? Number(state.pausedRemaining)
                : null;

            if (running && timerEnd !== null && timerEnd <= Date.now()) {
                finalizeExpiredTimer();
            }
        } catch (error) {
            warn('Invalid saved state reset.', error);
            mode = 'focus';
            running = false;
            timerEnd = null;
            pausedRemaining = null;
        }
    }

    function finalizeExpiredTimer() {
        const completedMode = mode;

        running = false;
        timerEnd = null;
        pausedRemaining = null;
        stopAudioEngine();

        if (completedMode === 'focus') {
            completedSessions += 1;
        }

        mode = completedMode === 'focus' ? 'break' : 'focus';
        saveState();
    }

    function getAudioContext() {
        if (audioContext) {
            return audioContext;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        audioContext = new AudioContextClass();
        return audioContext;
    }

    async function unlockAudio() {
        const context = getAudioContext();

        if (!context) {
            return false;
        }

        try {
            if (context.state === 'suspended') {
                await context.resume();
            }

            audioUnlocked = context.state === 'running';
            return audioUnlocked;
        } catch (error) {
            warn('Audio unlock failed.', error);
            return false;
        }
    }

    function ensureAudioOutputChain() {
        const context = getAudioContext();

        if (!context) {
            return false;
        }

        if (audioMasterGain && audioCompressor) {
            return true;
        }

        audioMasterGain = context.createGain();
        audioCompressor = context.createDynamicsCompressor();

        audioCompressor.threshold.value = -20;
        audioCompressor.knee.value = 12;
        audioCompressor.ratio.value = 6;
        audioCompressor.attack.value = 0.004;
        audioCompressor.release.value = 0.16;
        audioMasterGain.gain.value = CONFIG.audioMasterVolume;

        audioCompressor.connect(audioMasterGain);
        audioMasterGain.connect(context.destination);

        return true;
    }

    function createBrownNoiseBuffer(context, durationSeconds = 4) {
        const frames = Math.max(
            1,
            Math.floor(context.sampleRate * durationSeconds)
        );

        const buffer = context.createBuffer(1, frames, context.sampleRate);
        const data = buffer.getChannelData(0);
        let previous = 0;

        for (let index = 0; index < frames; index += 1) {
            const white = Math.random() * 2 - 1;
            previous = (previous + 0.02 * white) / 1.02;
            data[index] = previous * 3.2;
        }

        return buffer;
    }

    function startBrownNoise() {
        if (!brownNoiseEnabled || brownNoiseSource || !audioUnlocked) {
            return;
        }

        const context = getAudioContext();

        if (
            !context ||
            context.state !== 'running' ||
            !ensureAudioOutputChain()
        ) {
            return;
        }

        brownNoiseSource = context.createBufferSource();
        brownNoiseFilter = context.createBiquadFilter();
        brownNoiseGain = context.createGain();

        brownNoiseSource.buffer = createBrownNoiseBuffer(context);
        brownNoiseSource.loop = true;

        brownNoiseFilter.type = 'highpass';
        brownNoiseFilter.frequency.value = 45;
        brownNoiseFilter.Q.value = 0.55;

        brownNoiseGain.gain.setValueAtTime(0.0001, context.currentTime);
        brownNoiseGain.gain.exponentialRampToValueAtTime(
            CONFIG.brownNoiseVolume,
            context.currentTime + 0.35
        );

        brownNoiseSource.connect(brownNoiseFilter);
        brownNoiseFilter.connect(brownNoiseGain);
        brownNoiseGain.connect(audioCompressor);
        brownNoiseSource.start();
    }

    function stopBrownNoise() {
        if (!brownNoiseSource) {
            return;
        }

        const source = brownNoiseSource;
        const filter = brownNoiseFilter;
        const gain = brownNoiseGain;
        const context = getAudioContext();

        brownNoiseSource = null;
        brownNoiseFilter = null;
        brownNoiseGain = null;

        try {
            const now = context.currentTime;

            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(
                Math.max(0.0001, gain.gain.value),
                now
            );

            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
            source.stop(now + 0.2);
        } catch {
            try {
                source.stop();
            } catch {
                return;
            }
        }

        window.setTimeout(() => {
            try {
                source.disconnect();
                filter?.disconnect();
                gain?.disconnect();
            } catch {
                return;
            }
        }, 300);
    }

    function scheduleMetronomePulse(pulseTime) {
        if (!metronomeEnabled) {
            return;
        }

        const context = getAudioContext();

        if (!context || !audioCompressor) {
            return;
        }

        const primary = context.createOscillator();
        const harmonic = context.createOscillator();
        const primaryGain = context.createGain();
        const harmonicGain = context.createGain();
        const filter = context.createBiquadFilter();

        const startFrequency = mode === 'focus' ? 740 : 620;
        const endFrequency = mode === 'focus' ? 520 : 440;

        primary.type = 'sine';
        harmonic.type = 'triangle';

        primary.frequency.setValueAtTime(startFrequency, pulseTime);
        primary.frequency.exponentialRampToValueAtTime(
            endFrequency,
            pulseTime + 0.11
        );

        harmonic.frequency.setValueAtTime(startFrequency * 2, pulseTime);
        harmonic.frequency.exponentialRampToValueAtTime(
            endFrequency * 2,
            pulseTime + 0.075
        );

        filter.type = 'bandpass';
        filter.frequency.value = 960;
        filter.Q.value = 0.72;

        primaryGain.gain.setValueAtTime(0.0001, pulseTime);
        primaryGain.gain.exponentialRampToValueAtTime(
            CONFIG.metronomeVolume,
            pulseTime + 0.006
        );
        primaryGain.gain.exponentialRampToValueAtTime(
            0.0001,
            pulseTime + 0.13
        );

        harmonicGain.gain.setValueAtTime(0.0001, pulseTime);
        harmonicGain.gain.exponentialRampToValueAtTime(
            CONFIG.metronomeVolume * 0.34,
            pulseTime + 0.004
        );
        harmonicGain.gain.exponentialRampToValueAtTime(
            0.0001,
            pulseTime + 0.085
        );

        primary.connect(primaryGain);
        harmonic.connect(harmonicGain);
        primaryGain.connect(filter);
        harmonicGain.connect(filter);
        filter.connect(audioCompressor);

        primary.start(pulseTime);
        harmonic.start(pulseTime);
        primary.stop(pulseTime + 0.15);
        harmonic.stop(pulseTime + 0.1);

        primary.addEventListener('ended', () => {
            try {
                primary.disconnect();
                harmonic.disconnect();
                primaryGain.disconnect();
                harmonicGain.disconnect();
                filter.disconnect();
            } catch {
                return;
            }
        }, { once: true });
    }

    function runMetronomeScheduler() {
        if (
            !audioEngineRunning ||
            !running ||
            !metronomeEnabled ||
            document.hidden
        ) {
            return;
        }

        const context = getAudioContext();

        if (!context || context.state !== 'running') {
            return;
        }

        const secondsPerBeat = 60 / CONFIG.metronomeBpm;
        const limit = context.currentTime + CONFIG.audioScheduleAheadSeconds;

        while (nextMetronomeTime < limit) {
            scheduleMetronomePulse(nextMetronomeTime);
            nextMetronomeTime += secondsPerBeat;
        }
    }

    function startMetronome() {
        if (!metronomeEnabled || metronomeScheduler || !audioUnlocked) {
            return;
        }

        const context = getAudioContext();

        if (
            !context ||
            context.state !== 'running' ||
            !ensureAudioOutputChain()
        ) {
            return;
        }

        nextMetronomeTime = context.currentTime + 0.08;
        runMetronomeScheduler();

        metronomeScheduler = window.setInterval(
            runMetronomeScheduler,
            CONFIG.audioSchedulerMilliseconds
        );
    }

    function stopMetronome() {
        if (metronomeScheduler) {
            window.clearInterval(metronomeScheduler);
            metronomeScheduler = null;
        }

        nextMetronomeTime = 0;
    }

    async function startAudioEngine() {
        if (
            !running ||
            document.hidden ||
            (!brownNoiseEnabled && !metronomeEnabled)
        ) {
            return;
        }

        const unlocked = await unlockAudio();

        if (!unlocked) {
            return;
        }

        audioEngineRunning = true;
        ensureAudioOutputChain();

        if (brownNoiseEnabled) {
            startBrownNoise();
        }

        if (metronomeEnabled) {
            startMetronome();
        }
    }

    function stopAudioEngine() {
        audioEngineRunning = false;
        stopMetronome();
        stopBrownNoise();
    }

    function synchronizeAudioEngine() {
        if (!running || document.hidden) {
            stopAudioEngine();
            return;
        }

        audioEngineRunning = true;

        if (brownNoiseEnabled) {
            startBrownNoise();
        } else {
            stopBrownNoise();
        }

        if (metronomeEnabled) {
            startMetronome();
        } else {
            stopMetronome();
        }
    }

    function removePreviousHosts() {
        document.querySelectorAll(
            '[id^="vr-preexam-focus-widget-host"],' +
            '[id^="skilljar-focus-assistant-host"]'
        ).forEach(element => {
            element.remove();
        });
    }

    function createHost() {
        removePreviousHosts();

        if (!document.body) {
            return false;
        }

        host = document.createElement('div');
        host.id = CONFIG.hostId;

        Object.assign(host.style, {
            position: 'fixed',
            left: '10px',
            bottom: '10px',
            zIndex: '2147483640',
            display: 'block',
            width: 'auto',
            height: 'auto',
            maxWidth: 'calc(100vw - 20px)',
            margin: '0',
            padding: '0',
            border: '0',
            outline: '0',
            background: 'transparent',
            pointerEvents: 'auto',
            contain: 'layout style'
        });

        document.body.appendChild(host);
        shadow = host.attachShadow({ mode: 'closed' });

        return true;
    }

    function addStyles() {
        const style = document.createElement('style');

        style.textContent = `
            :host {
                all: initial;
                color-scheme: dark;
            }

            *,
            *::before,
            *::after {
                box-sizing: border-box;
            }

            .assistant {
                --text: #f4f7f8;
                --muted: #aeb7c0;
                --surface-raised: #292e34;
                --surface-hover: #363d45;
                --border: rgba(255,255,255,.15);
                --accent: #78d6ff;
                --focus-green: #53c783;
                --focus-blue: #4b9ee8;
                --focus-amber: #e2a93b;
                --focus-red: #dc5b55;
                --break-teal: #52cfb4;
                --break-blue: #62a7df;
                --confirm-green: #2f9d67;
                --confirm-green-hover: #38b979;
                --roll-duration: 540ms;

                position: relative;
                width: min(${CONFIG.expandedWidth}px, calc(100vw - 20px));
                color: var(--text);
                background: #181b1e;
                border: 1px solid var(--border);
                border-radius: 13px;
                box-shadow:
                    0 16px 44px rgba(0,0,0,.46),
                    0 3px 12px rgba(0,0,0,.33);
                font: 400 12px/1.4 "Segoe UI", Roboto, Arial, sans-serif;
                overflow: visible;
                transition:
                    width 250ms cubic-bezier(.2,.8,.25,1),
                    border-color 160ms ease,
                    box-shadow 160ms ease;
            }

            .assistant:hover,
            .assistant:focus-within,
            .assistant.controls-pinned {
                border-color: rgba(255,255,255,.3);
                box-shadow:
                    0 18px 48px rgba(0,0,0,.5),
                    0 4px 14px rgba(0,0,0,.35);
            }

            .shell {
                position: relative;
                overflow: hidden;
                border-radius: inherit;
            }

            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                min-height: 46px;
                padding: 7px 9px 7px 12px;
                background: linear-gradient(145deg, #30353b, #171a1e);
                border-bottom: 1px solid var(--border);
            }

            .title-group {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
                flex: 1;
            }

            .title {
                overflow: hidden;
                color: var(--text);
                font-size: 13px;
                font-weight: 600;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .material-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                flex: 0 0 auto;
                color: currentColor;
            }

            .material-icon svg {
                display: block;
                width: 100%;
                height: 100%;
                fill: currentColor;
            }

            .title-icon {
                width: 23px;
                height: 23px;
                color: var(--accent);
            }

            .header-actions {
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 0 0 auto;
            }

            .body {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 500px;
                padding: 11px 11px 17px;
                overflow: hidden;
                background: linear-gradient(145deg, #202429, #15181b);
            }

            .card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 11px;
                background: #25292e;
                border: 1px solid rgba(255,255,255,.09);
                border-radius: 9px;
            }

            .deadline-card {
                align-items: flex-start;
            }

            .card-main {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }

            .card-copy {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 0;
            }

            .card-icon,
            .mode-icon {
                width: 24px;
                height: 24px;
                color: var(--muted);
            }

            .mode-icon {
                color: var(--focus-green);
            }

            .label,
            .mini-label {
                color: var(--muted);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: .7px;
                text-transform: uppercase;
            }

            .date,
            .guidance {
                color: var(--muted);
                font-size: 10px;
                font-weight: 500;
                white-space: nowrap;
            }

            .date {
                align-self: flex-start;
                margin-top: 1px;
            }

            .guidance {
                color: #b9ddc5;
                text-align: right;
            }

            .session-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                color: var(--muted);
                font-size: 10px;
                font-weight: 600;
            }

            .session-summary {
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            .session-icon {
                width: 16px;
                height: 16px;
            }

            .controls,
            .expanded-confirmation {
                display: flex;
                align-items: center;
                gap: 7px;
                min-height: 33px;
            }

            .controls {
                flex-wrap: wrap;
            }

            .expanded-confirmation {
                display: none;
                justify-content: space-between;
            }

            .assistant.confirming-expanded .controls {
                display: none;
            }

            .assistant.confirming-expanded .expanded-confirmation {
                display: flex;
            }

            .confirmation-message {
                overflow: hidden;
                color: var(--muted);
                font-size: 10px;
                font-weight: 600;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .confirmation-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            button {
                font: 600 11px/1.2 "Segoe UI", Roboto, Arial, sans-serif;
            }

            .icon-button,
            .action-button,
            .pop-button,
            .confirm-button,
            .cancel-button,
            .compact-confirm-button,
            .compact-cancel-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: var(--text);
                background: var(--surface-raised);
                border: 1px solid rgba(255,255,255,.17);
                border-radius: 7px;
                cursor: pointer;
                transition:
                    color 120ms ease,
                    background-color 120ms ease,
                    border-color 120ms ease,
                    transform 120ms ease,
                    box-shadow 120ms ease;
            }

            .icon-button {
                width: 31px;
                height: 31px;
                padding: 0;
            }

            .action-button,
            .confirm-button,
            .cancel-button {
                min-height: 33px;
                padding: 6px 10px;
                gap: 6px;
            }

            .action-button .material-icon,
            .confirm-button .material-icon,
            .cancel-button .material-icon {
                width: 18px;
                height: 18px;
            }

            .icon-button:hover,
            .icon-button:focus-visible,
            .action-button:hover,
            .action-button:focus-visible,
            .pop-button:hover,
            .pop-button:focus-visible,
            .cancel-button:hover,
            .cancel-button:focus-visible,
            .compact-cancel-button:hover,
            .compact-cancel-button:focus-visible {
                color: #fff;
                background: var(--surface-hover);
                border-color: rgba(120,214,255,.58);
                box-shadow: 0 4px 12px rgba(0,0,0,.3);
                outline: none;
                transform: translateY(-1px);
            }

            .start-button {
                background: #235f9c;
                border-color: #4386c7;
            }

            .start-button.running {
                background: #983f3f;
                border-color: #c56363;
            }

            .settings-button,
            .settings-pop-button {
                color: #fff;
                background: #325d74;
                border-color: #5d94ae;
            }

            .settings-button:hover,
            .settings-button:focus-visible {
                background: #3d7089;
                border-color: #78bad7;
            }

            .confirm-button,
            .compact-confirm-button {
                color: #fff;
                background: var(--confirm-green);
                border-color: #62c893;
            }

            .confirm-button:hover,
            .confirm-button:focus-visible,
            .compact-confirm-button:hover,
            .compact-confirm-button:focus-visible {
                color: #fff;
                background: var(--confirm-green-hover);
                border-color: #8de0b3;
            }

            .cancel-button,
            .compact-cancel-button {
                background: #30353b;
            }

            .clock {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
            }

            .time-unit {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .digit-group {
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }

            .digit {
                position: relative;
                width: 26px;
                height: 39px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,.15);
                border-radius: 6px;
                background:
                    linear-gradient(
                        to bottom,
                        #080a0c 0%,
                        #15191d 18%,
                        #252b31 48%,
                        #1b2025 52%,
                        #15191d 84%,
                        #07090b 100%
                    );
                box-shadow:
                    inset 0 5px 9px rgba(0,0,0,.58),
                    inset 0 -5px 9px rgba(0,0,0,.62),
                    0 4px 8px rgba(0,0,0,.36);
                contain: layout paint;
            }

            .digit.leading-zero-faded {
                opacity: .2;
                filter: saturate(.35) brightness(.76);
            }

            .digit.leading-zero-faded .number {
                color: #75808a;
                text-shadow: none;
            }

            .digit::after {
                position: absolute;
                inset: 0;
                z-index: 9;
                content: "";
                pointer-events: none;
                background:
                    linear-gradient(
                        to bottom,
                        rgba(0,0,0,.32),
                        transparent 26%,
                        transparent 74%,
                        rgba(0,0,0,.42)
                    );
            }

            .reel {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 200%;
                transform: translate3d(0,0,0);
            }

            .reel.rolling {
                animation:
                    mechanical-roll
                    var(--roll-duration)
                    cubic-bezier(.22,.72,.22,1)
                    forwards;
            }

            .number {
                position: absolute;
                left: 0;
                display: grid;
                place-items: center;
                width: 100%;
                height: 50%;
                color: var(--text);
                font: 700 23px/1 Consolas, "Courier New", monospace;
                text-shadow:
                    0 0 6px rgba(255,255,255,.15),
                    0 2px 2px rgba(0,0,0,.84);
            }

            .number.current {
                top: 0;
            }

            .number.next {
                top: 50%;
            }

            .unit-letter {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 12px;
                height: 24px;
                color: #d7e0e8;
                background: rgba(255,255,255,.07);
                border: 1px solid rgba(255,255,255,.1);
                border-radius: 4px;
                font-size: 14px;
                font-weight: 800;
                line-height: 1;
                text-transform: uppercase;
            }

            .focus-separator {
                color: var(--accent);
                font: 700 23px/1 Consolas, "Courier New", monospace;
            }

            @keyframes mechanical-roll {
                0% {
                    transform: translate3d(0,0,0);
                }

                68% {
                    transform: translate3d(0,-51.5%,0);
                }

                84% {
                    transform: translate3d(0,-49.2%,0);
                }

                100% {
                    transform: translate3d(0,-50%,0);
                }
            }

            .mini-timer {
                display: flex;
                align-items: center;
                gap: 9px;
                flex: 1;
                min-width: 0;
                max-width: 0;
                opacity: 0;
                overflow: hidden;
            }

            .mini-timer-icon {
                width: 21px;
                height: 21px;
                color: var(--muted);
            }

            .mini-timer-copy {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .mini-timer-copy .mini-label {
                width: 45px;
                flex: 0 0 45px;
                line-height: 1.15;
                white-space: normal;
            }

            .mini-clock .digit {
                width: 26px;
                height: 39px;
            }

            .mini-clock .number {
                font-size: 23px;
            }

            .mini-clock .focus-separator {
                font-size: 23px;
            }

            .progress-track {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                height: 7px;
                overflow: hidden;
                background: rgba(255,255,255,.11);
                border-radius: 0 0 12px 12px;
            }

            .progress-fill {
                display: block;
                width: 0;
                height: 100%;
                background: var(--focus-green);
                transition:
                    width 500ms linear,
                    background-color 280ms ease;
            }

            .settings-panel {
                position: absolute;
                z-index: 40;
                display: none;
                flex-direction: column;
                gap: 8px;
                width: 270px;
                max-width: calc(100vw - 20px);
                padding: 10px;
                color: var(--text);
                background: linear-gradient(145deg, #292f35, #181c20);
                border: 1px solid rgba(120,214,255,.35);
                border-radius: 9px;
                box-shadow:
                    0 16px 34px rgba(0,0,0,.52),
                    0 4px 12px rgba(0,0,0,.35);
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transform: translateY(5px) scale(.985);
                transform-origin: bottom left;
                transition:
                    opacity 150ms ease,
                    visibility 150ms ease,
                    transform 170ms cubic-bezier(.2,.8,.25,1);
            }

            .settings-panel.visible {
                display: flex;
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
                transform: translateY(0) scale(1);
            }

            .expanded-settings-panel {
                left: calc(100% + 8px);
                bottom: 10px;
            }

            .mini-settings-panel {
                left: 8px;
                bottom: calc(100% + 58px);
            }

            .settings-title {
                display: flex;
                align-items: center;
                gap: 7px;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
            }

            .settings-title .material-icon {
                color: var(--accent);
            }

            .setting-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-height: 34px;
                padding: 6px 8px;
                background: rgba(255,255,255,.035);
                border: 1px solid rgba(255,255,255,.04);
                border-radius: 7px;
            }

            .setting-copy {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .setting-icon {
                width: 18px;
                height: 18px;
                color: var(--muted);
            }

            .setting-label {
                color: var(--text);
                font-size: 10px;
                font-weight: 600;
            }

            .switch {
                position: relative;
                width: 38px;
                height: 22px;
                flex: 0 0 auto;
                cursor: pointer;
            }

            .switch input {
                position: absolute;
                width: 1px;
                height: 1px;
                opacity: 0;
            }

            .switch-track {
                position: absolute;
                inset: 0;
                background: #4a5057;
                border: 1px solid rgba(255,255,255,.14);
                border-radius: 999px;
                transition:
                    background-color 150ms ease,
                    border-color 150ms ease;
            }

            .switch-track::after {
                position: absolute;
                top: 3px;
                left: 3px;
                width: 14px;
                height: 14px;
                content: "";
                background: #d7dde2;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,.4);
                transition:
                    transform 160ms ease,
                    background-color 160ms ease;
            }

            .switch input:checked + .switch-track {
                background: #2e8b61;
                border-color: #62c893;
            }

            .switch input:checked + .switch-track::after {
                background: #fff;
                transform: translateX(16px);
            }

            .switch input:focus-visible + .switch-track {
                outline: 2px solid rgba(120,214,255,.6);
                outline-offset: 2px;
            }

            .mini-pop-controls,
            .mini-confirmation {
                position: absolute;
                left: 8px;
                bottom: calc(100% + 5px);
                display: none;
                align-items: center;
                gap: 8px;
                min-height: 44px;
                padding: 0 0 8px;
                pointer-events: none;
            }

            .mini-pop-controls {
                flex-wrap: nowrap;
                white-space: nowrap;
            }

            .pop-button,
            .compact-confirm-button,
            .compact-cancel-button {
                position: relative;
                width: 36px;
                height: 36px;
                padding: 0;
                border-radius: 8px;
                box-shadow: 0 8px 20px rgba(0,0,0,.42);
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transform: translateY(5px);
                transition:
                    opacity 140ms ease,
                    visibility 140ms ease,
                    transform 160ms cubic-bezier(.2,.8,.25,1),
                    color 120ms ease,
                    background-color 120ms ease,
                    border-color 120ms ease,
                    box-shadow 120ms ease;
            }

            .compact-confirm-button,
            .compact-cancel-button {
                width: auto;
                min-width: 82px;
                padding: 0 12px;
                gap: 6px;
                white-space: nowrap;
            }
            .compact-confirm-button .material-icon,
            .compact-cancel-button .material-icon {
                width: 18px;
                height: 18px;
            }
            .deadline-pop-button {
                color: #fff;
                background: #51448c;
                border-color: #796cc1;
            }

            .deadline-panel {
                position: absolute;
                left: 8px;
                bottom: calc(100% + 58px);
                z-index: 35;
                display: none;
                width: min(${CONFIG.expandedWidth - 22}px, calc(100vw - 20px));
                color: var(--text);
                background: #25292e;
                border: 1px solid rgba(120,214,255,.35);
                border-radius: 9px;
                box-shadow: 0 12px 28px rgba(0,0,0,.46);
            }

            .deadline-panel.visible {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 11px;
            }

            .deadline-panel .deadline-clock {
                display: inline-flex;
            }

            .deadline-panel .date {
                display: inline-flex;
            }

            .assistant.minimized {
                width: min(${CONFIG.minimizedWidth}px, calc(100vw - 20px));
            }

            .assistant.minimized .title,
            .assistant.minimized .title-icon {
                display: none;
            }

            .assistant.minimized .header {
                min-height: 57px;
                padding-bottom: 10px;
                border-bottom: 0;
            }

            .assistant.minimized .mini-timer {
                max-width: 230px;
                opacity: 1;
            }

            .assistant.minimized .body {
                max-height: 0;
                gap: 0;
                padding: 0 11px;
                opacity: 0;
                pointer-events: none;
            }

            .assistant.minimized .mini-pop-controls {
                display: flex;
            }

            .assistant.minimized:hover .mini-pop-controls,
            .assistant.minimized:focus-within .mini-pop-controls,
            .assistant.minimized.controls-pinned .mini-pop-controls {
                pointer-events: auto;
            }

            .assistant.minimized:hover .pop-button,
            .assistant.minimized:focus-within .pop-button,
            .assistant.minimized.controls-pinned .pop-button {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
                transform: translateY(0);
            }

            .assistant.minimized.confirming-compact .mini-pop-controls {
                display: none;
            }

            .assistant.minimized.confirming-compact .mini-confirmation {
                display: flex;
                pointer-events: auto;
            }

            .assistant.minimized.confirming-compact .compact-confirm-button,
            .assistant.minimized.confirming-compact .compact-cancel-button {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }

            .assistant.break-mode {
                border-color: rgba(95,210,186,.58);
            }

            .assistant.break-mode .header {
                background: linear-gradient(145deg, #194e46, #203b37);
            }

            @media (max-width: 900px) {
                .expanded-settings-panel {
                    left: 8px;
                    right: auto;
                    bottom: calc(100% + 8px);
                }
            }

            @media (max-width: 700px) {
                .assistant {
                    width: min(${CONFIG.expandedWidth}px, calc(100vw - 12px));
                }

                .assistant.minimized {
                    width: min(${CONFIG.minimizedWidth}px, calc(100vw - 12px));
                }

                .date,
                .guidance {
                    display: none;
                }
            }

            @media (hover: none), (pointer: coarse) {
                .assistant.minimized .mini-pop-controls {
                    display: flex;
                    pointer-events: auto;
                }

                .assistant.minimized .pop-button {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }
            }
        `;

        shadow.appendChild(style);
    }

    function createIcon(name, className = '') {
        const wrapper = document.createElement('span');
        const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        );
        const path = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
        );

        wrapper.className = ['material-icon', className]
            .filter(Boolean)
            .join(' ');

        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        path.setAttribute('d', ICONS[name]);

        svg.appendChild(path);
        wrapper.appendChild(svg);

        return wrapper;
    }

    function replaceIcon(button, iconName) {
        button
            ?.querySelector('.material-icon')
            ?.replaceWith(createIcon(iconName));
    }

    function createButton(className, iconName, label, title) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = className;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.appendChild(createIcon(iconName));

        if (label) {
            const text = document.createElement('span');
            text.className = 'button-label';
            text.textContent = label;
            button.appendChild(text);
        }

        return button;
    }

    function createPopButton(className, iconName, title) {
        const button = createButton(
            `pop-button ${className}`,
            iconName,
            '',
            title
        );

        button.dataset.tooltip = title;
        return button;
    }

    function createToggle(label, iconName, checked) {
        const row = document.createElement('div');
        const copy = document.createElement('div');
        const labelElement = document.createElement('span');
        const switchLabel = document.createElement('label');
        const input = document.createElement('input');
        const track = document.createElement('span');

        row.className = 'setting-row';
        copy.className = 'setting-copy';
        labelElement.className = 'setting-label';
        switchLabel.className = 'switch';
        track.className = 'switch-track';

        labelElement.textContent = label;
        input.type = 'checkbox';
        input.checked = checked;
        input.setAttribute('aria-label', label);

        copy.append(
            createIcon(iconName, 'setting-icon'),
            labelElement
        );

        switchLabel.append(input, track);
        row.append(copy, switchLabel);

        return { row, input };
    }

    function createSettingsContent() {
        const fragment = document.createDocumentFragment();
        const title = document.createElement('div');

        title.className = 'settings-title';
        title.append(
            createIcon('settings'),
            document.createTextNode('Audio settings')
        );

        const brownNoiseToggle = createToggle(
            'Brown Noise',
            'noise',
            brownNoiseEnabled
        );

        const metronomeToggle = createToggle(
            '60 BPM Neuro-Metronome',
            'metronome',
            metronomeEnabled
        );

        fragment.append(
            title,
            brownNoiseToggle.row,
            metronomeToggle.row
        );

        return {
            fragment,
            brownNoiseInput: brownNoiseToggle.input,
            metronomeInput: metronomeToggle.input
        };
    }

    function createMechanicalDigit(initialValue = '0') {
        const digit = document.createElement('span');
        const reel = document.createElement('span');
        const current = document.createElement('span');
        const next = document.createElement('span');

        digit.className = 'digit';
        reel.className = 'reel';
        current.className = 'number current';
        next.className = 'number next';

        current.textContent = initialValue;
        next.textContent = initialValue;

        reel.append(current, next);
        digit.appendChild(reel);

        digitStates.set(digit, {
            reel,
            current,
            next,
            value: initialValue,
            rolling: false,
            pending: null,
            fallback: null,
            token: 0
        });

        return digit;
    }

    function finishRoll(digit, expectedValue, token) {
        const state = digitStates.get(digit);

        if (!state || !state.rolling || state.token !== token) {
            return;
        }

        if (state.fallback) {
            clearTimeout(state.fallback);
        }

        state.fallback = null;
        state.value = expectedValue;
        state.current.textContent = expectedValue;
        state.next.textContent = expectedValue;
        state.rolling = false;
        state.reel.classList.remove('rolling');

        if (state.pending !== null && state.pending !== state.value) {
            const pending = state.pending;
            state.pending = null;
            rollDigit(digit, pending, true);
        } else {
            state.pending = null;
        }
    }

    function rollDigit(digit, newValue, animate = true) {
        const state = digitStates.get(digit);

        if (!state) {
            return;
        }

        if (state.value === newValue && !state.rolling) {
            return;
        }

        if (state.rolling) {
            state.pending = newValue;
            return;
        }

        if (!animate) {
            state.value = newValue;
            state.current.textContent = newValue;
            state.next.textContent = newValue;
            state.reel.classList.remove('rolling');
            return;
        }

        state.rolling = true;
        state.token += 1;

        const token = state.token;

        state.next.textContent = newValue;
        state.reel.classList.remove('rolling');
        void state.reel.offsetHeight;
        state.reel.classList.add('rolling');

        state.reel.addEventListener('animationend', () => {
            finishRoll(digit, newValue, token);
        }, { once: true });

        state.fallback = setTimeout(() => {
            finishRoll(digit, newValue, token);
        }, CONFIG.rollFallbackMs);
    }

    function createTimeUnit(unit) {
        const wrapper = document.createElement('span');
        const group = document.createElement('span');
        const letter = document.createElement('span');

        wrapper.className = 'time-unit';
        wrapper.dataset.unit = unit;
        group.className = 'digit-group';
        letter.className = 'unit-letter';
        letter.textContent = unit;

        wrapper.append(group, letter);
        return wrapper;
    }

    function updateDigitGroup(group, number, minimumLength, animate) {
        if (!group) {
            return [];
        }

        const text = String(
            Math.max(0, Math.floor(Number(number) || 0))
        ).padStart(minimumLength, '0');

        let digits = Array.from(group.children);

        if (digits.length !== text.length) {
            group.replaceChildren();

            for (const character of text) {
                group.appendChild(createMechanicalDigit(character));
            }

            digits = Array.from(group.children);
            animate = false;
        }

        digits.forEach((digit, index) => {
            rollDigit(digit, text[index], animate);
        });

        return digits;
    }

    function createDeadlineClock() {
        const clock = document.createElement('span');
        clock.className = 'clock deadline-clock';

        clock.append(
            createTimeUnit('d'),
            createTimeUnit('h'),
            createTimeUnit('m'),
            createTimeUnit('s')
        );

        return clock;
    }

    function createFocusClock(extraClass = '') {
        const clock = document.createElement('span');
        const minutes = document.createElement('span');
        const seconds = document.createElement('span');
        const separator = document.createElement('span');

        clock.className = `clock focus-clock ${extraClass}`.trim();
        minutes.className = 'digit-group';
        minutes.dataset.unit = 'minutes';
        seconds.className = 'digit-group';
        seconds.dataset.unit = 'seconds';
        separator.className = 'focus-separator';
        separator.textContent = ':';

        clock.append(minutes, separator, seconds);
        return clock;
    }

    function getGroup(clock, unit) {
        return clock?.querySelector(
            `[data-unit="${unit}"] .digit-group,` +
            `.digit-group[data-unit="${unit}"]`
        ) || null;
    }

    function getDeadlineParts(milliseconds) {
        const totalSeconds = Math.floor(
            Math.max(0, milliseconds) / 1000
        );

        return {
            days: Math.floor(totalSeconds / 86400),
            hours: Math.floor((totalSeconds % 86400) / 3600),
            minutes: Math.floor((totalSeconds % 3600) / 60),
            seconds: totalSeconds % 60
        };
    }

    function updateDeadlineClock(clock, milliseconds, animate) {
        if (!clock) {
            return;
        }

        const parts = getDeadlineParts(milliseconds);

        const dayDigits = updateDigitGroup(
            getGroup(clock, 'd'),
            parts.days,
            3,
            animate
        );

        dayDigits.forEach(digit => {
            digit.classList.remove('leading-zero-faded');
        });

        if (
            parts.days >= 10 &&
            parts.days <= 99 &&
            dayDigits.length === 3
        ) {
            dayDigits[0].classList.add('leading-zero-faded');
        }

        updateDigitGroup(getGroup(clock, 'h'), parts.hours, 2, animate);
        updateDigitGroup(getGroup(clock, 'm'), parts.minutes, 2, animate);
        updateDigitGroup(getGroup(clock, 's'), parts.seconds, 2, animate);
    }

    function updateFocusClock(clock, milliseconds, animate) {
        if (!clock) {
            return;
        }

        const totalSeconds = Math.max(
            0,
            Math.ceil(milliseconds / 1000)
        );

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        updateDigitGroup(
            getGroup(clock, 'minutes'),
            minutes,
            Math.max(2, String(minutes).length),
            animate
        );

        updateDigitGroup(
            getGroup(clock, 'seconds'),
            seconds,
            2,
            animate
        );
    }

    function createProgressTrack() {
        const track = document.createElement('span');
        const fill = document.createElement('span');

        track.className = 'progress-track';
        fill.className = 'progress-fill';
        track.appendChild(fill);

        return track;
    }

    function buildWidget() {
        assistant = document.createElement('section');
        assistant.className = 'assistant';
        assistant.setAttribute('role', 'region');
        assistant.setAttribute('aria-label', 'Pre-exam focus assistant');

        assistant.innerHTML = `
            <div class="shell">
                <div class="header">
                    <div class="title-group">
                        <span class="title-icon-slot"></span>
                        <span class="title">Pre-Exam Focus</span>

                        <div class="mini-timer">
                            <span class="mini-timer-icon-slot"></span>

                            <div class="mini-timer-copy">
                                <span class="mini-label">Focus session</span>
                                <span class="mini-clock-slot"></span>
                            </div>
                        </div>
                    </div>

                    <div class="header-actions"></div>
                </div>

                <div class="body">
                    <div class="card deadline-card">
                        <div class="card-main">
                            <span class="deadline-icon-slot"></span>

                            <div class="card-copy">
                                <span class="label">December 31 deadline</span>
                                <span class="deadline-clock-slot"></span>
                            </div>
                        </div>

                        <span class="date"></span>
                    </div>

                    <div class="card">
                        <div class="card-main">
                            <span class="mode-icon-slot"></span>

                            <div class="card-copy">
                                <span class="label mode-label">Focus session</span>
                                <span class="focus-clock-slot"></span>
                            </div>
                        </div>

                        <span class="guidance">One lesson at a time</span>
                    </div>

                    <div class="session-row">
                        <span class="session-summary">
                            <span class="session-icon-slot"></span>
                            <span class="session-count"></span>
                        </span>

                        <span class="progress-status"></span>
                    </div>

                    <div class="controls"></div>

                    <div class="expanded-confirmation">
                        <span class="confirmation-message"></span>
                        <div class="confirmation-actions"></div>
                    </div>
                </div>

                <span class="progress-track-slot"></span>
            </div>

            <div class="mini-pop-controls"></div>
            <div class="mini-confirmation"></div>

            <div
                class="settings-panel expanded-settings-panel"
                role="dialog"
                aria-label="Expanded audio settings"
            ></div>

            <div
                class="settings-panel mini-settings-panel"
                role="dialog"
                aria-label="Minimized audio settings"
            ></div>

            <div
                class="deadline-panel"
                role="dialog"
                aria-label="Deadline countdown"
            >
                <div class="card-main">
                    <span class="deadline-panel-icon-slot"></span>
                    <div class="card-copy">
                        <span class="label">December 31 deadline</span>
                        <span class="deadline-panel-clock-slot"></span>
                    </div>
                </div>
                <span class="date deadline-panel-date"></span>
            </div>
        `;

        assistant.querySelector('.title-icon-slot').appendChild(
            createIcon('school', 'title-icon')
        );

        assistant.querySelector('.mini-timer-icon-slot').appendChild(
            createIcon('timer', 'mini-timer-icon')
        );

        assistant.querySelector('.deadline-icon-slot').appendChild(
            createIcon('event', 'card-icon')
        );

        assistant.querySelector('.mode-icon-slot').appendChild(
            createIcon('book', 'mode-icon')
        );

        assistant.querySelector('.session-icon-slot').appendChild(
            createIcon('complete', 'session-icon')
        );

        assistant.querySelector('.deadline-clock-slot').appendChild(
            createDeadlineClock()
        );

        assistant.querySelector('.focus-clock-slot').appendChild(
            createFocusClock()
        );

        assistant.querySelector('.mini-clock-slot').appendChild(
            createFocusClock('mini-clock')
        );

        assistant.querySelector('.progress-track-slot').appendChild(
            createProgressTrack()
        );
        assistant.querySelector('.deadline-panel-icon-slot').appendChild(
            createIcon('event', 'card-icon')
        );
        assistant.querySelector('.deadline-panel-clock-slot').appendChild(
            createDeadlineClock()
        );

        elements.minimize = createButton(
            'icon-button minimize-button',
            'minimize',
            '',
            'Minimize'
        );

        elements.expandedSettings = createButton(
            'icon-button settings-button',
            'settings',
            '',
            'Audio settings'
        );

        elements.expandedSettings.setAttribute('aria-haspopup', 'dialog');
        elements.expandedSettings.setAttribute('aria-expanded', 'false');

        elements.start = createButton(
            'action-button start-button',
            'play',
            'Start Focus',
            'Start focus timer'
        );

        elements.reset = createButton(
            'action-button reset-button',
            'reset',
            'Reset',
            'Reset timer'
        );

        elements.switchMode = createButton(
            'action-button switch-button',
            'break',
            'Start Break',
            'Switch timer mode'
        );

        assistant.querySelector('.header-actions').append(
            elements.minimize
        );

        assistant.querySelector('.controls').append(
            elements.start,
            elements.reset,
            elements.switchMode,
            elements.expandedSettings
        );

        elements.popStart = createPopButton(
            'pop-start',
            'play',
            'Start Focus'
        );

        elements.popReset = createPopButton(
            'pop-reset',
            'reset',
            'Reset timer'
        );

        elements.popSwitch = createPopButton(
            'pop-switch',
            'break',
            'Start Break'
        );

        elements.popDeadline = createPopButton(
            'deadline-pop-button',
            'event',
            'Show deadline'
        );

        elements.popSettings = createPopButton(
            'settings-pop-button',
            'settings',
            'Audio settings'
        );

        elements.popSettings.setAttribute('aria-haspopup', 'dialog');
        elements.popSettings.setAttribute('aria-expanded', 'false');

        assistant.querySelector('.mini-pop-controls').append(
            elements.popStart,
            elements.popReset,
            elements.popSwitch,
            elements.popDeadline,
            elements.popSettings
        );

        elements.expandedConfirm = createButton(
            'confirm-button',
            'complete',
            'Confirm',
            'Confirm action'
        );

        elements.expandedCancel = createButton(
            'cancel-button',
            'cancel',
            'Cancel',
            'Cancel action'
        );

        assistant.querySelector('.confirmation-actions').append(
            elements.expandedConfirm,
            elements.expandedCancel
        );

        elements.compactConfirm = createButton(
            'compact-confirm-button',
            'complete',
            'Confirm',
            'Confirm'
        );

        elements.compactCancel = createButton(
            'compact-cancel-button',
            'cancel',
            'Cancel',
            'Cancel'
        );

        assistant.querySelector('.mini-confirmation').append(
            elements.compactConfirm,
            elements.compactCancel
        );

        const expandedSettingsContent = createSettingsContent();
        const miniSettingsContent = createSettingsContent();

        elements.expandedBrownNoiseInput =
            expandedSettingsContent.brownNoiseInput;

        elements.expandedMetronomeInput =
            expandedSettingsContent.metronomeInput;

        elements.miniBrownNoiseInput =
            miniSettingsContent.brownNoiseInput;

        elements.miniMetronomeInput =
            miniSettingsContent.metronomeInput;

        assistant.querySelector('.expanded-settings-panel').appendChild(
            expandedSettingsContent.fragment
        );

        assistant.querySelector('.mini-settings-panel').appendChild(
            miniSettingsContent.fragment
        );

        elements.confirmationMessage =
            assistant.querySelector('.confirmation-message');

        elements.expandedSettingsPanel =
            assistant.querySelector('.expanded-settings-panel');

        elements.miniSettingsPanel =
            assistant.querySelector('.mini-settings-panel');

        elements.deadlinePanel =
            assistant.querySelector('.deadline-panel');
        elements.deadlinePanelClock =
            assistant.querySelector('.deadline-panel .deadline-clock');
        elements.deadlinePanelDate =
            assistant.querySelector('.deadline-panel-date');

        bindEvents();
        shadow.appendChild(assistant);
    }

    function bindEvents() {
        elements.minimize.addEventListener('click', toggleMinimized);

        elements.expandedSettings.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toggleSettingsPanel(false);
        });

        elements.popSettings.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toggleSettingsPanel(true);
        });

        elements.popDeadline.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toggleDeadlinePanel();
        });

        bindConfirmedAction(elements.start, getTimerRequest);
        bindConfirmedAction(elements.popStart, getTimerRequest);
        bindConfirmedAction(elements.reset, getResetRequest);
        bindConfirmedAction(elements.popReset, getResetRequest);
        bindConfirmedAction(elements.switchMode, getModeRequest);
        bindConfirmedAction(elements.popSwitch, getModeRequest);

        elements.expandedConfirm.addEventListener(
            'click',
            confirmPendingAction
        );

        elements.compactConfirm.addEventListener(
            'click',
            confirmPendingAction
        );

        elements.expandedCancel.addEventListener(
            'click',
            cancelPendingAction
        );

        elements.compactCancel.addEventListener(
            'click',
            cancelPendingAction
        );

        [
            elements.expandedBrownNoiseInput,
            elements.miniBrownNoiseInput
        ].forEach(input => {
            input.addEventListener('change', async event => {
                await unlockAudio();

                brownNoiseEnabled = event.target.checked;
                syncSettingInputs();
                saveState();
                synchronizeAudioEngine();
            });
        });

        [
            elements.expandedMetronomeInput,
            elements.miniMetronomeInput
        ].forEach(input => {
            input.addEventListener('change', async event => {
                await unlockAudio();

                metronomeEnabled = event.target.checked;
                syncSettingInputs();
                saveState();
                synchronizeAudioEngine();
            });
        });

        assistant.addEventListener('pointerdown', () => {
            unlockAudio();
        }, { passive: true });

        assistant.addEventListener('pointerleave', () => {
            const floatingPanelVisible =
                elements.miniSettingsPanel.classList.contains('visible') ||
                elements.expandedSettingsPanel.classList.contains('visible') ||
                elements.deadlinePanel.classList.contains('visible');

            if (
                !assistant.classList.contains('confirming-compact') &&
                !floatingPanelVisible
            ) {
                assistant.classList.remove('controls-pinned');
            }
        });

        assistant.addEventListener('keydown', event => {
            if (event.key !== 'Escape') {
                return;
            }

            if (pendingAction) {
                cancelPendingAction();
                return;
            }

            closeFloatingPanels();
        });

        shadow.addEventListener('pointerdown', event => {
            const path = event.composedPath();

            const clickedSettings =
                path.includes(elements.expandedSettings) ||
                path.includes(elements.popSettings) ||
                path.includes(elements.expandedSettingsPanel) ||
                path.includes(elements.miniSettingsPanel);

            const clickedDeadline =
                path.includes(elements.popDeadline) ||
                path.includes(elements.deadlinePanel);

            if (!clickedSettings) {
                closeSettingsPanels();
            }

            if (!clickedDeadline) {
                closeDeadlinePanel();
            }
        });

        document.addEventListener('pointerdown', event => {
            if (host?.contains(event.target)) {
                return;
            }
            closeFloatingPanels();
            if (!assistant.classList.contains('minimized')) {
                storageSet(STORAGE.minimized, 'true');
                applyMinimizedState();
                updateDisplay(false);
            }
        }, { passive: true });
    }

    function syncSettingInputs() {
        [
            elements.expandedBrownNoiseInput,
            elements.miniBrownNoiseInput
        ].forEach(input => {
            input.checked = brownNoiseEnabled;
        });

        [
            elements.expandedMetronomeInput,
            elements.miniMetronomeInput
        ].forEach(input => {
            input.checked = metronomeEnabled;
        });
    }

    function closeSettingsPanels() {
        elements.expandedSettingsPanel?.classList.remove('visible');
        elements.miniSettingsPanel?.classList.remove('visible');

        elements.expandedSettings?.setAttribute(
            'aria-expanded',
            'false'
        );

        elements.popSettings?.setAttribute(
            'aria-expanded',
            'false'
        );
    }

    function toggleSettingsPanel(minimizedPanel) {
        closeDeadlinePanel();

        const targetPanel = minimizedPanel
            ? elements.miniSettingsPanel
            : elements.expandedSettingsPanel;

        const otherPanel = minimizedPanel
            ? elements.expandedSettingsPanel
            : elements.miniSettingsPanel;

        otherPanel.classList.remove('visible');

        const visible = targetPanel.classList.toggle('visible');

        elements.expandedSettings.setAttribute(
            'aria-expanded',
            String(!minimizedPanel && visible)
        );

        elements.popSettings.setAttribute(
            'aria-expanded',
            String(minimizedPanel && visible)
        );

        assistant.classList.toggle('controls-pinned', visible);
        syncSettingInputs();
    }

    function closeFloatingPanels() {
        closeSettingsPanels();
        closeDeadlinePanel();

        if (
            !assistant.matches(':hover') &&
            !assistant.matches(':focus-within')
        ) {
            assistant.classList.remove('controls-pinned');
        }
    }

    function bindConfirmedAction(button, requestFactory) {
        button.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();

            await unlockAudio();

            const request = requestFactory();
            showConfirmation(request.message, request.action);
        });
    }

    function getTimerRequest() {
        return running
            ? {
                message: 'Pause the current timer?',
                action: pauseTimer
            }
            : {
                message: mode === 'focus'
                    ? 'Start the focus session?'
                    : 'Start the recovery break?',
                action: startTimer
            };
    }

    function getResetRequest() {
        return {
            message: mode === 'focus'
                ? 'Reset the focus timer?'
                : 'Reset the recovery timer?',
            action: resetTimer
        };
    }

    function getModeRequest() {
        return {
            message: mode === 'focus'
                ? 'Switch to recovery mode?'
                : 'Return to focus mode?',
            action: switchMode
        };
    }

    function showConfirmation(message, action) {
        pendingAction = action;
        closeFloatingPanels();

        if (assistant.classList.contains('minimized')) {
            assistant.classList.add(
                'confirming-compact',
                'controls-pinned'
            );
        } else {
            elements.confirmationMessage.textContent = message;
            assistant.classList.add('confirming-expanded');
        }
    }

    function closeConfirmation() {
        pendingAction = null;

        assistant.classList.remove(
            'confirming-expanded',
            'confirming-compact'
        );
    }

    async function confirmPendingAction() {
        const action = pendingAction;
        closeConfirmation();

        if (typeof action === 'function') {
            await action();
        }
    }

    function cancelPendingAction() {
        closeConfirmation();
    }

    function toggleDeadlinePanel() {
        closeSettingsPanels();

        const visible = elements.deadlinePanel.classList.toggle('visible');

        assistant.classList.toggle('controls-pinned', visible);
        updateDeadlinePanel();
    }

    function closeDeadlinePanel() {
        elements.deadlinePanel?.classList.remove('visible');
    }

    function updateDeadlinePanel(animate = true) {
        const now = new Date();
        updateDeadlineClock(
            elements.deadlinePanelClock,
            CONFIG.deadline.getTime() - now.getTime(),
            animate
        );
        elements.deadlinePanelDate.textContent = formatDate(now);
    }

    function applyMinimizedState() {
        closeConfirmation();
        closeFloatingPanels();

        const minimized = readBoolean(STORAGE.minimized, false);

        assistant.classList.toggle('minimized', minimized);

        replaceIcon(
            elements.minimize,
            minimized ? 'expand' : 'minimize'
        );

        elements.minimize.title = minimized ? 'Expand' : 'Minimize';
        elements.minimize.setAttribute(
            'aria-label',
            minimized ? 'Expand' : 'Minimize'
        );
    }

    function toggleMinimized() {
        storageSet(
            STORAGE.minimized,
            String(!readBoolean(STORAGE.minimized, false))
        );

        applyMinimizedState();
        updateDisplay(false);
    }

    function getModeDuration() {
        return (
            mode === 'focus'
                ? CONFIG.focusMinutes
                : CONFIG.breakMinutes
        ) * 60000;
    }

    function getRemainingTime() {
        if (running && Number.isFinite(timerEnd)) {
            return timerEnd - Date.now();
        }

        if (Number.isFinite(pausedRemaining)) {
            return pausedRemaining;
        }

        return getModeDuration();
    }

    async function startTimer() {
        const remaining = Number.isFinite(pausedRemaining)
            ? Math.max(0, pausedRemaining)
            : getModeDuration();

        timerEnd = Date.now() + remaining;
        pausedRemaining = null;
        running = true;

        saveState();
        updateDisplay(false);
        await startAudioEngine();
    }

    function pauseTimer() {
        if (Number.isFinite(timerEnd)) {
            pausedRemaining = Math.max(0, timerEnd - Date.now());
        }

        running = false;
        timerEnd = null;

        stopAudioEngine();
        saveState();
        updateDisplay(false);
    }

    function resetTimer() {
        running = false;
        timerEnd = null;
        pausedRemaining = null;

        stopAudioEngine();
        saveState();
        updateDisplay(false);
    }

    function switchMode() {
        running = false;
        timerEnd = null;
        pausedRemaining = null;

        stopAudioEngine();

        mode = mode === 'focus' ? 'break' : 'focus';

        saveState();
        updateDisplay(false);
    }

    function completeTimer() {
        const completedMode = mode;

        running = false;
        timerEnd = null;
        pausedRemaining = null;

        stopAudioEngine();

        if (completedMode === 'focus') {
            completedSessions += 1;
        }

        mode = completedMode === 'focus' ? 'break' : 'focus';

        saveState();
        updateDisplay(false);

        if (typeof GM_notification === 'function') {
            GM_notification({
                title: completedMode === 'focus'
                    ? 'Focus session complete'
                    : 'Break complete',
                text: completedMode === 'focus'
                    ? 'Take a short recovery break.'
                    : 'Return to the next focus session.',
                timeout: 10000
            });
        }
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat(undefined, {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    function updateProgress(remaining) {
        const duration = getModeDuration();

        const safeRemaining = Math.max(
            0,
            Math.min(duration, remaining)
        );

        const percent = duration > 0
            ? (duration - safeRemaining) / duration * 100
            : 0;

        const remainingPercent = 100 - percent;

        let color;
        let status;

        if (mode === 'break') {
            color = remainingPercent > 60
                ? 'var(--break-teal)'
                : remainingPercent > 25
                    ? 'var(--break-blue)'
                    : 'var(--focus-amber)';

            status = running ? 'Recovering' : 'Break ready';
        } else {
            color = remainingPercent > 70
                ? 'var(--focus-green)'
                : remainingPercent > 40
                    ? 'var(--focus-blue)'
                    : remainingPercent > 15
                        ? 'var(--focus-amber)'
                        : 'var(--focus-red)';

            status = running ? 'Focused' : 'Ready';
        }

        elements.progressFill.style.width = `${percent}%`;
        elements.progressFill.style.backgroundColor = color;

        elements.sessionCount.textContent =
            `${completedSessions} ` +
            (completedSessions === 1
                ? 'focus session'
                : 'focus sessions');

        elements.progressStatus.textContent = status;
    }

    function updateButtons() {
        const breakMode = mode === 'break';
        const startLabel = breakMode ? 'Start Break' : 'Start Focus';

        [
            elements.start,
            elements.popStart
        ].forEach(button => {
            replaceIcon(button, running ? 'pause' : 'play');

            const text = button.querySelector('.button-label');

            if (text) {
                text.textContent = running ? 'Pause' : startLabel;
            }

            button.title = running ? 'Pause timer' : startLabel;
            button.setAttribute('aria-label', button.title);
            button.classList.toggle('running', running);

            if (button.classList.contains('pop-button')) {
                button.dataset.tooltip = button.title;
            }
        });

        const modeLabel = breakMode
            ? 'Return to Focus'
            : 'Start Break';

        [
            elements.switchMode,
            elements.popSwitch
        ].forEach(button => {
            replaceIcon(button, breakMode ? 'book' : 'break');

            const text = button.querySelector('.button-label');

            if (text) {
                text.textContent = modeLabel;
            }

            button.title = modeLabel;
            button.setAttribute('aria-label', modeLabel);

            if (button.classList.contains('pop-button')) {
                button.dataset.tooltip = modeLabel;
            }
        });
    }

    function cacheElements() {
        elements.deadlineClock =
            assistant.querySelector('.deadline-clock');

        elements.focusClock =
            assistant.querySelector('.focus-clock:not(.mini-clock)');

        elements.miniClock =
            assistant.querySelector('.mini-clock');

        elements.date =
            assistant.querySelector('.date');

        elements.modeLabel =
            assistant.querySelector('.mode-label');

        elements.miniLabel =
            assistant.querySelector('.mini-label');

        elements.modeIconSlot =
            assistant.querySelector('.mode-icon-slot');

        elements.miniTimerIconSlot =
            assistant.querySelector('.mini-timer-icon-slot');

        elements.guidance =
            assistant.querySelector('.guidance');

        elements.progressFill =
            assistant.querySelector('.progress-fill');

        elements.sessionCount =
            assistant.querySelector('.session-count');

        elements.progressStatus =
            assistant.querySelector('.progress-status');
    }

    function updateDisplay(animate = true) {
        if (!assistant) {
            return;
        }

        const now = new Date();
        let remaining = getRemainingTime();

        if (running && remaining <= 0) {
            completeTimer();
            return;
        }

        remaining = Math.max(0, remaining);

        const minimized =
            assistant.classList.contains('minimized');

        if (!minimized) {
            updateDeadlineClock(
                elements.deadlineClock,
                CONFIG.deadline.getTime() - now.getTime(),
                animate
            );
        }

        updateFocusClock(
            elements.focusClock,
            remaining,
            animate && !minimized
        );

        updateFocusClock(
            elements.miniClock,
            remaining,
            animate && minimized
        );

        elements.date.textContent = formatDate(now);

        const breakMode = mode === 'break';

        assistant.classList.toggle('break-mode', breakMode);

        const label = breakMode
            ? 'Recovery break'
            : 'Focus session';

        elements.modeLabel.textContent = label;
        elements.miniLabel.textContent = label;

        elements.modeIconSlot.replaceChildren(
            createIcon(
                breakMode ? 'break' : 'book',
                'mode-icon'
            )
        );

        elements.miniTimerIconSlot.replaceChildren(
            createIcon(
                breakMode ? 'break' : 'timer',
                'mini-timer-icon'
            )
        );

        elements.guidance.textContent = breakMode
            ? 'Rest briefly, then return'
            : 'One lesson at a time';

        updateButtons();
        updateProgress(remaining);

        if (elements.deadlinePanel.classList.contains('visible')) {
            updateDeadlinePanel(animate && minimized);
        }
    }

    function scheduleAlignedUpdate() {
        if (alignedTimer) {
            clearTimeout(alignedTimer);
        }

        if (document.hidden) {
            alignedTimer = setTimeout(
                scheduleAlignedUpdate,
                5000
            );

            return;
        }

        const delay = 1000 - Date.now() % 1000 + 8;

        alignedTimer = setTimeout(() => {
            updateDisplay(true);
            scheduleAlignedUpdate();
        }, delay);
    }

    function cleanup() {
        stopAudioEngine();
        saveState();

        if (alignedTimer) {
            clearTimeout(alignedTimer);
        }

        if (audioContext) {
            try {
                audioContext.close();
            } catch {
                return;
            }
        }
    }

    function initialize() {
        try {
            restoreState();

            if (!createHost()) {
                throw new Error('Document body unavailable.');
            }

            addStyles();
            buildWidget();
            cacheElements();

            syncSettingInputs();
            applyMinimizedState();
            updateDisplay(false);
            scheduleAlignedUpdate();

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    stopAudioEngine();
                    return;
                }

                updateDisplay(false);
                scheduleAlignedUpdate();
                synchronizeAudioEngine();
            }, { passive: true });

            window.addEventListener('pagehide', cleanup, {
                once: true
            });

            log(
                'Initialized with external settings panels, Brown Noise, and metronome.'
            );
        } catch (error) {
            console.error(
                CONFIG.logPrefix,
                'Initialization failed.',
                error
            );

            document.getElementById(CONFIG.hostId)?.remove();
        }
    }

    initialize();
})();