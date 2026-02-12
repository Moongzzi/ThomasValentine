(() => {
	const scriptEl = document.currentScript || document.querySelector("script[data-bgm-src]");
	const src = scriptEl?.dataset?.bgmSrc || "music/BGM/BackgroundMusic.mp3";
	const audio = new Audio(src);
	const volumeInput = document.getElementById("bgm-volume");
	const seVolumeInput = document.getElementById("se-volume");
	const bgmControl = document.querySelector(".bgm-control");
	const storedVolume = parseFloat(localStorage.getItem("bgm-volume"));
	const initialVolume = Number.isFinite(storedVolume) ? storedVolume : 0.6;
	const storedSeVolume = parseFloat(localStorage.getItem("se-volume"));
	const initialSeVolume = Number.isFinite(storedSeVolume) ? storedSeVolume : 0.7;
	const clampVolume = (value) => Math.min(Math.max(value, 0), 1);

	audio.loop = true;
	audio.preload = "auto";
	audio.volume = clampVolume(initialVolume);

	if (volumeInput) {
		volumeInput.value = audio.volume.toFixed(2);
		volumeInput.addEventListener("input", (event) => {
			const value = parseFloat(event.target.value);
			if (Number.isNaN(value)) {
				return;
			}
			audio.volume = clampVolume(value);
			localStorage.setItem("bgm-volume", String(audio.volume));
		});
	} else {
		localStorage.setItem("bgm-volume", String(audio.volume));
	}

	const setSeVolume = (value) => {
		const volume = clampVolume(value);
		window.__seVolume = volume;
		localStorage.setItem("se-volume", String(volume));
		if (seVolumeInput) {
			seVolumeInput.value = volume.toFixed(2);
		}
		window.dispatchEvent(new CustomEvent("se-volume-change", { detail: { volume } }));
	};

	window.getSeVolume = () => {
		const stored = parseFloat(localStorage.getItem("se-volume"));
		if (Number.isFinite(stored)) {
			return clampVolume(stored);
		}
		return clampVolume(initialSeVolume);
	};

	if (seVolumeInput) {
		seVolumeInput.value = clampVolume(initialSeVolume).toFixed(2);
		seVolumeInput.addEventListener("input", (event) => {
			const value = parseFloat(event.target.value);
			if (Number.isNaN(value)) {
				return;
			}
			setSeVolume(value);
		});
		setSeVolume(initialSeVolume);
	} else {
		setSeVolume(initialSeVolume);
	}

	const injectToggleStyles = () => {
		if (document.getElementById("bgm-toggle-styles")) {
			return;
		}
		const style = document.createElement("style");
		style.id = "bgm-toggle-styles";
		style.textContent = `
.bgm-toggle {
	display: none;
	align-items: center;
	justify-content: center;
	padding: 6px 10px;
	border-radius: 12px;
	border: 1px solid rgba(58, 29, 36, 0.18);
	background: rgba(255, 255, 255, 0.9);
	color: inherit;
	font-family: "Noto Sans KR", "Segoe UI", sans-serif;
	font-size: 0.75rem;
	letter-spacing: 0.08em;
	cursor: pointer;
}

.bgm-toggle svg {
	width: 18px;
	height: 18px;
	fill: currentColor;
}

@media (max-width: 600px) {
	.bgm-toggle {
		display: inline-flex;
	}
	.bgm-control {
		top: 12px;
		right: 12px;
		border-radius: 16px;
		overflow: hidden;
	}
	.bgm-control.is-collapsed .bgm-row {
		display: none;
	}
}
`;
		document.head.appendChild(style);
	};

	const setupMobileToggle = () => {
		if (!bgmControl) {
			return;
		}
		injectToggleStyles();
		const toggleButton = document.createElement("button");
		toggleButton.type = "button";
		toggleButton.className = "bgm-toggle";
		toggleButton.setAttribute("aria-label", "사운드 설정 펼치기/접기");
		toggleButton.innerHTML =
			"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M4 9v6h4l5 4V5L8 9H4zm12.5 3c0-1.8-1-3.4-2.5-4.2v8.4c1.5-.8 2.5-2.4 2.5-4.2zm2.5 0c0 2.9-1.6 5.5-4 6.9v-2.2c1.2-1 2-2.6 2-4.7s-.8-3.7-2-4.7V5.1c2.4 1.4 4 4 4 6.9z\"/></svg>";
		toggleButton.setAttribute("aria-expanded", "true");
		bgmControl.prepend(toggleButton);

		const mobileQuery = window.matchMedia("(max-width: 600px)");
		const applyCollapsed = (collapsed) => {
			bgmControl.classList.toggle("is-collapsed", collapsed);
			toggleButton.setAttribute("aria-expanded", String(!collapsed));
		};

		applyCollapsed(mobileQuery.matches);
		mobileQuery.addEventListener("change", (event) => {
			applyCollapsed(event.matches);
		});

		["click", "pointerdown"].forEach((eventName) => {
			toggleButton.addEventListener(eventName, (event) => {
				event.stopPropagation();
			});
		});
		toggleButton.addEventListener("click", () => {
			applyCollapsed(!bgmControl.classList.contains("is-collapsed"));
		});
	};

	setupMobileToggle();

	const applyStoredTime = () => {
		const storedTime = parseFloat(localStorage.getItem("bgm-time"));
		if (!Number.isFinite(storedTime) || storedTime <= 0 || !audio.duration) {
			return;
		}
		const safeTime = Math.min(storedTime, Math.max(0, audio.duration - 0.1));
		audio.currentTime = safeTime;
	};

	audio.addEventListener("loadedmetadata", applyStoredTime, { once: true });

	const tryPlay = () => {
		audio.play().catch(() => {
			return;
		});
	};

	audio.addEventListener("canplay", tryPlay, { once: true });
	window.addEventListener("pageshow", () => {
		applyStoredTime();
		tryPlay();
	});
	window.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			applyStoredTime();
			tryPlay();
		}
	});

	const resumeOnInteraction = () => {
		tryPlay();
		document.removeEventListener("click", resumeOnInteraction);
		document.removeEventListener("keydown", resumeOnInteraction);
	};

	document.addEventListener("click", resumeOnInteraction);
	document.addEventListener("keydown", resumeOnInteraction);

	let lastStored = 0;
	const storeTime = () => {
		if (!Number.isFinite(audio.currentTime)) {
			return;
		}
		if (Math.abs(audio.currentTime - lastStored) < 1) {
			return;
		}
		lastStored = audio.currentTime;
		localStorage.setItem("bgm-time", String(audio.currentTime));
	};

	audio.addEventListener("timeupdate", storeTime);
	window.addEventListener("pagehide", () => {
		localStorage.setItem("bgm-time", String(audio.currentTime));
		if (window.__activeSeAudio) {
			window.__activeSeAudio.pause();
			window.__activeSeAudio.currentTime = 0;
		}
	});
})();
