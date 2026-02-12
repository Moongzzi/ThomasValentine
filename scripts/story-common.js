(() => {
	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
			accentLines = [],
			accentDoubleDelay = false,
			largeGapToken = "__gap_large__",
			spacerClass = "spacer",
			largeSpacerClass = "spacer-large",
			extraDelayMs = 400
		} = options;

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
		return { hintDelayMs };
	};

	const addHint = (stage, options = {}) => {
		const { hintText = "화면을 클릭하여 넘어가기", hintDelayMs = 0 } = options;
		const hint = document.createElement("div");
		hint.className = "hint";
		hint.textContent = hintText;
		if (!prefersReducedMotion.matches) {
			hint.style.setProperty("--hint-delay", `${hintDelayMs}ms`);
		}
		stage.appendChild(hint);
		return hint;
	};

	const setupClickNavigation = (options = {}) => {
		const { nextUrl, hintDelayMs = 0, fadeDurationMs = 450 } = options;
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
		window.setTimeout(() => {
			canNavigate = true;
			document.body.classList.add("ready");
		}, readyDelay);

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
			fadeDurationMs = 450
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
		window.setTimeout(() => {
			actionButton.classList.add("show");
		}, delay);

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
