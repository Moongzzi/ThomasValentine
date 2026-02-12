(() => {
	const body = document.body;
	const message = body.dataset.message || "";
	const nextUrl = body.dataset.nextUrl;
	const answerSalt = body.dataset.answerSalt || "";
	const answerHash = body.dataset.answerHash || "";
	const hintThreshold = Number.parseInt(body.dataset.hintThreshold || "10", 10);

	const target = document.getElementById("typed-text");
	const quizContent = document.getElementById("quiz-content");
	const quizImage = document.querySelector(".quiz-image");
	const helpButton = document.querySelector(".help-button");
	const hintButton = document.querySelector(".hint-button");
	const answerField = document.getElementById("answer-field");
	const answerButton = document.getElementById("answer-button");
	const imageModal = document.getElementById("image-modal");
	const imageModalTarget = document.getElementById("image-modal-target");
	const typeDelayMs = 55;
	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	let index = 0;
	let hasNavigated = false;
	let wrongCount = 0;

	const typeNext = () => {
		if (!target) {
			return;
		}
		target.textContent = message.slice(0, index + 1);
		index += 1;
		if (index < message.length) {
			window.setTimeout(typeNext, typeDelayMs);
			return;
		}
		if (quizContent) {
			quizContent.classList.add("show");
		}
	};

	if (message) {
		typeNext();
	}

	if (prefersReducedMotion.matches) {
		document.body.classList.add("fade-in");
	} else {
		window.requestAnimationFrame(() => {
			document.body.classList.add("fade-in");
		});
	}

	const openModal = () => {
		if (!imageModal || !imageModalTarget || !quizImage) {
			return;
		}
		imageModalTarget.src = quizImage.src;
		imageModal.classList.add("show");
		imageModal.setAttribute("aria-hidden", "false");
	};

	const closeModal = () => {
		if (!imageModal) {
			return;
		}
		imageModal.classList.remove("show");
		imageModal.setAttribute("aria-hidden", "true");
	};

	const toggleHelp = () => {
		if (!helpButton) {
			return;
		}
		const isOpen = helpButton.classList.toggle("is-open");
		helpButton.setAttribute("aria-expanded", String(isOpen));
	};

	const closeHelp = () => {
		if (!helpButton || !helpButton.classList.contains("is-open")) {
			return;
		}
		helpButton.classList.remove("is-open");
		helpButton.setAttribute("aria-expanded", "false");
	};

	const toggleHint = () => {
		if (!hintButton) {
			return;
		}
		const isOpen = hintButton.classList.toggle("is-open");
		hintButton.setAttribute("aria-expanded", String(isOpen));
	};

	const closeHint = () => {
		if (!hintButton || !hintButton.classList.contains("is-open")) {
			return;
		}
		hintButton.classList.remove("is-open");
		hintButton.setAttribute("aria-expanded", "false");
	};

	const hashAnswer = async (input) => {
		const data = new TextEncoder().encode(input);
		const digest = await crypto.subtle.digest("SHA-256", data);
		return Array.from(new Uint8Array(digest))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
	};

	const showWrongAnswer = () => {
		if (!answerField) {
			return;
		}
		answerField.classList.remove("is-wrong");
		answerField.setAttribute("aria-invalid", "true");
		window.requestAnimationFrame(() => {
			answerField.classList.add("is-wrong");
		});
		answerField.focus();
		answerField.select();
		wrongCount += 1;
		if (hintButton && wrongCount >= hintThreshold) {
			hintButton.classList.add("show");
		}
	};

	const checkAnswer = async () => {
		if (!answerField) {
			return;
		}
		const value = answerField.value.trim();
		if (hasNavigated) {
			return;
		}
		const digest = await hashAnswer(`${answerSalt}:${value}`);
		if (digest === answerHash && nextUrl) {
			hasNavigated = true;
			window.location.href = nextUrl;
			return;
		}
		showWrongAnswer();
	};

	if (quizImage) {
		quizImage.addEventListener("click", openModal);
	}
	if (imageModal) {
		imageModal.addEventListener("click", closeModal);
	}
	if (helpButton) {
		helpButton.addEventListener("click", (event) => {
			event.stopPropagation();
			toggleHelp();
		});
	}
	if (hintButton) {
		hintButton.addEventListener("click", (event) => {
			event.stopPropagation();
			toggleHint();
		});
	}
	document.addEventListener("click", (event) => {
		if (helpButton && !helpButton.contains(event.target)) {
			closeHelp();
		}
		if (hintButton && !hintButton.contains(event.target)) {
			closeHint();
		}
	});
	if (answerButton) {
		answerButton.addEventListener("click", checkAnswer);
	}
	if (answerField) {
		answerField.addEventListener("input", () => {
			answerField.classList.remove("is-wrong");
			answerField.removeAttribute("aria-invalid");
		});
		answerField.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				checkAnswer();
			}
		});
	}
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeModal();
		}
	});
})();
