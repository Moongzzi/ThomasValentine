(() => {
	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const wait = (ms) =>
		new Promise((resolve) => {
			window.setTimeout(resolve, Math.max(0, ms));
		});

	const clampVolume = (value) => Math.min(Math.max(value, 0), 1);
	const getSeVolume = () => {
		if (typeof window.getSeVolume === "function") {
			return window.getSeVolume();
		}
		const stored = parseFloat(localStorage.getItem("se-volume"));
		return Number.isFinite(stored) ? clampVolume(stored) : 0.7;
	};

	const stopActiveSeAudio = () => {
		if (!window.__activeSeAudio) {
			return;
		}
		window.__activeSeAudio.pause();
		window.__activeSeAudio.currentTime = 0;
		window.__activeSeAudio = null;
	};

	const getVoiceDurationMs = (src, fallbackMs) =>
		new Promise((resolve) => {
			if (!src) {
				resolve(fallbackMs);
				return;
			}
			const probeAudio = new Audio(src);
			probeAudio.preload = "metadata";
			let finished = false;
			const finish = (durationMs) => {
				if (finished) {
					return;
				}
				finished = true;
				resolve(durationMs);
			};

			const timeoutId = window.setTimeout(() => {
				finish(fallbackMs);
			}, 1800);

			probeAudio.addEventListener(
				"loadedmetadata",
				() => {
					window.clearTimeout(timeoutId);
					if (Number.isFinite(probeAudio.duration) && probeAudio.duration > 0) {
						finish(Math.max(250, probeAudio.duration * 1000));
						return;
					}
					finish(fallbackMs);
				},
				{ once: true }
			);

			probeAudio.addEventListener(
				"error",
				() => {
					window.clearTimeout(timeoutId);
					finish(fallbackMs);
				},
				{ once: true }
			);
		});

	const playVoiceAndWait = (src, durationMs) =>
		new Promise((resolve) => {
			if (!src) {
				wait(durationMs).then(resolve);
				return;
			}

			stopActiveSeAudio();
			const audio = new Audio(src);
			audio.preload = "auto";
			audio.volume = getSeVolume();
			window.__activeSeAudio = audio;

			let completed = false;
			let timeoutId = null;
			const done = () => {
				if (completed) {
					return;
				}
				completed = true;
				if (timeoutId) {
					window.clearTimeout(timeoutId);
				}
				resolve();
			};

			const setFallbackTimer = (ms) => {
				if (timeoutId) {
					window.clearTimeout(timeoutId);
				}
				timeoutId = window.setTimeout(done, Math.max(250, ms));
			};

			audio.addEventListener("ended", done, { once: true });
			audio.addEventListener("error", done, { once: true });
			setFallbackTimer(durationMs + 240);

			audio
				.play()
				.then(() => {
					if (Number.isFinite(audio.duration) && audio.duration > 0) {
						setFallbackTimer(audio.duration * 1000 + 240);
					}
				})
				.catch(() => {
					setFallbackTimer(durationMs);
				});
		});

	const revealLineWithFade = (lineElement, text, durationMs) =>
		new Promise((resolve) => {
			lineElement.textContent = text;
			if (prefersReducedMotion.matches) {
				lineElement.style.opacity = "1";
				lineElement.style.transform = "none";
				lineElement.style.animation = "none";
				resolve();
				return;
			}

			const fadeDurationMs = Math.max(450, Math.min(1000, durationMs * 0.45));
			lineElement.style.opacity = "0";
			lineElement.style.transform = "translateY(8px)";
			lineElement.style.animation = `fadeIn ${fadeDurationMs}ms ease forwards`;
			window.setTimeout(resolve, fadeDurationMs);
		});

	const getHintDelayMs = ({ lineCount, lineDelay, extraDelayMs }) => {
		if (prefersReducedMotion.matches) {
			return 0;
		}
		return lineCount * lineDelay + extraDelayMs;
	};

	const renderLines = (stage, options = {}) => {
		const {
			lines = [],
			lineDelay = 1100,
			voiceClips = [],
			accentLines = [],
			accentDoubleDelay = false,
			largeGapToken = "__gap_large__",
			spacerClass = "spacer",
			largeSpacerClass = "spacer-large",
			extraDelayMs = 400
		} = options;

		const hasVoiceClips = Array.isArray(voiceClips) && voiceClips.length > 0;

		if (hasVoiceClips) {
			const lineEntries = lines.filter((text) => text.trim().length > 0).length;
			const usableVoiceCount = Math.min(lineEntries, voiceClips.length);
			let voiceIndex = 0;

			const readyPromise = (async () => {
				for (const text of lines) {
					if (text === largeGapToken) {
						const spacer = document.createElement("div");
						spacer.className = largeSpacerClass;
						stage.appendChild(spacer);
						continue;
					}

					if (text.trim().length === 0) {
						const spacer = document.createElement("div");
						spacer.className = spacerClass;
						stage.appendChild(spacer);
						continue;
					}

					const line = document.createElement("p");
					const isAccent = accentLines.includes(text);
					line.className = isAccent ? "line accent" : "line";
					line.style.animation = "none";
					line.textContent = "";
					stage.appendChild(line);

					const clipSrc = voiceClips[voiceIndex] || "";
					voiceIndex += 1;
					const fallbackDurationMs = Math.max(700, text.length * 85);
					const voiceDurationMs = await getVoiceDurationMs(clipSrc, fallbackDurationMs);
					const playbackTask = playVoiceAndWait(clipSrc, voiceDurationMs);

					if (prefersReducedMotion.matches) {
						line.textContent = text;
						await playbackTask;
						continue;
					}

					await Promise.all([revealLineWithFade(line, text, voiceDurationMs), playbackTask]);
				}
			})();

			const hintDelayMs = prefersReducedMotion.matches
				? 0
				: usableVoiceCount > 0
				? extraDelayMs
				: getHintDelayMs({
						lineCount: lines.length,
						lineDelay,
						extraDelayMs
				  });

			return { hintDelayMs, readyPromise };
		}

		lines.forEach((text, index) => {
			if (text === largeGapToken) {
				const spacer = document.createElement("div");
				spacer.className = largeSpacerClass;
				stage.appendChild(spacer);
				return;
			}

			if (text.trim().length === 0) {
				const spacer = document.createElement("div");
				spacer.className = spacerClass;
				stage.appendChild(spacer);
				return;
			}

			const line = document.createElement("p");
			const isAccent = accentLines.includes(text);
			line.className = isAccent ? "line accent" : "line";
			line.textContent = text;
			if (!prefersReducedMotion.matches) {
				const delay = `${index * lineDelay}ms`;
				line.style.animationDelay =
					accentDoubleDelay && isAccent ? `${delay}, ${delay}` : delay;
			}
			stage.appendChild(line);
		});

		const hintDelayMs = getHintDelayMs({
			lineCount: lines.length,
			lineDelay,
			extraDelayMs
		});
		return { hintDelayMs, readyPromise: Promise.resolve() };
	};

	const addHint = (stage, options = {}) => {
		const {
			hintText = "화면을 클릭하여 넘어가기",
			hintDelayMs = 0,
			waitForPromise = null
		} = options;
		const hint = document.createElement("div");
		hint.className = "hint";
		hint.textContent = hintText;

		const appendHint = () => {
			if (hint.isConnected) {
				return;
			}
			if (!prefersReducedMotion.matches) {
				hint.style.setProperty("--hint-delay", "0ms");
			}
			stage.appendChild(hint);
		};

		if (waitForPromise) {
			const delayPromise = prefersReducedMotion.matches ? Promise.resolve() : wait(hintDelayMs);
			Promise.all([delayPromise, Promise.resolve(waitForPromise)]).then(appendHint);
			return hint;
		}

		if (!prefersReducedMotion.matches) {
			hint.style.setProperty("--hint-delay", `${hintDelayMs}ms`);
		}
		stage.appendChild(hint);
		return hint;
	};

	const setupClickNavigation = (options = {}) => {
		const { nextUrl, hintDelayMs = 0, fadeDurationMs = 450, lockUntilPromise = null } = options;
		if (!nextUrl) {
			return;
		}

		const volumeInputs = [
			document.getElementById("bgm-volume"),
			document.getElementById("se-volume")
		].filter(Boolean);
		volumeInputs.forEach((input) => {
			["click", "pointerdown"].forEach((eventName) => {
				input.addEventListener(eventName, (event) => {
					event.stopPropagation();
				});
			});
		});

		let canNavigate = false;
		let isNavigating = false;
		const readyDelay = prefersReducedMotion.matches ? 0 : hintDelayMs;
		const readyByTimer = wait(readyDelay);
		const readyByLock = lockUntilPromise ? Promise.resolve(lockUntilPromise) : Promise.resolve();
		Promise.all([readyByTimer, readyByLock]).then(() => {
			canNavigate = true;
			document.body.classList.add("ready");
		});

		document.addEventListener("click", () => {
			if (!canNavigate || isNavigating) {
				return;
			}
			isNavigating = true;
			document.body.classList.add("fade-out");
			const delay = prefersReducedMotion.matches ? 0 : fadeDurationMs;
			window.setTimeout(() => {
				window.location.href = nextUrl;
			}, delay);
		});
	};

	const setupActionButton = (stage, options = {}) => {
		const {
			label = "확인하기",
			targetUrl,
			showDelayMs = 0,
			fadeDurationMs = 450,
			showAfterPromise = null
		} = options;

		if (!targetUrl) {
			return null;
		}

		const actions = document.createElement("div");
		actions.className = "actions";
		const actionButton = document.createElement("button");
		actionButton.className = "action-button";
		actionButton.type = "button";
		actionButton.textContent = label;

		let isNavigating = false;
		actionButton.addEventListener("click", () => {
			if (isNavigating) {
				return;
			}
			isNavigating = true;
			document.body.classList.add("fade-out");
			const delay = prefersReducedMotion.matches ? 0 : fadeDurationMs;
			window.setTimeout(() => {
				window.location.href = targetUrl;
			}, delay);
		});

		actions.appendChild(actionButton);
		stage.appendChild(actions);

		const delay = prefersReducedMotion.matches ? 0 : showDelayMs;
		const delayTask = wait(delay);
		const lockTask = showAfterPromise ? Promise.resolve(showAfterPromise) : Promise.resolve();
		Promise.all([delayTask, lockTask]).then(() => {
			actionButton.classList.add("show");
		});

		return actionButton;
	};

	window.StoryPage = {
		prefersReducedMotion,
		renderLines,
		addHint,
		setupClickNavigation,
		setupActionButton
	};
})();
