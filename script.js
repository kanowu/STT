const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isManualStop = false;
let interimDiv = null;

const sysContainer = document.getElementById('sys-container');
const subContainer = document.getElementById('subtitle-container');
const langSelect = document.getElementById('lang-select');
const chkContinuous = document.getElementById('chk-continuous');
const chkInterim = document.getElementById('chk-interim');
const chkAutoRestart = document.getElementById('chk-autorestart');
const restartDelayInput = document.getElementById('restart-delay');
const fontSizeInput = document.getElementById('font-size');
const textColorInput = document.getElementById('text-color');
const bgColorInput = document.getElementById('bg-color');
const chkTran = document.getElementById('chk-tran');
const langTran = document.getElementById('lang-tran');

function updateAppearance() {
    subContainer.style.fontSize = fontSizeInput.value + 'px';
    subContainer.style.color = textColorInput.value;
    subContainer.style.backgroundColor = bgColorInput.value;
}

fontSizeInput.addEventListener('input', updateAppearance);
textColorInput.addEventListener('input', updateAppearance);
bgColorInput.addEventListener('input', updateAppearance);
updateAppearance();

function appendSystemMsg(msg) {
    sysContainer.insertAdjacentHTML('beforeend', `<div class="system-msg">[SYS] ${msg}</div>`);
    sysContainer.scrollTop = sysContainer.scrollHeight;
}

function displayText(msg, interim = false) {
    while (subContainer.firstChild) {
      subContainer.removeChild(subContainer.firstChild);
    }
    if (interim) {
        subContainer.insertAdjacentHTML('afterbegin', `<div class="interim-text">${msg}</div>`);
    } else {
        if (chkTran.checked) { quickTranslate(msg, langTran.value); }
        subContainer.insertAdjacentHTML('afterbegin', `<div>${msg}</div>`);
    }
}

// init
function initAndStartRecognition() {
    if (!SpeechRecognition) {
        appendSystemMsg('Not Support Web Speech API');
        return;
    }

    if (recognition) {
        isManualStop = true;
        recognition.onend = null;
        try { recognition.stop(); } catch (e) {}
    }

    isManualStop = false;
    recognition = new SpeechRecognition();

    let lang = langSelect.value;
    recognition.lang = (lang == 'ja') ? 'ja-JP' : lang;
    recognition.continuous = chkContinuous.checked;
    recognition.interimResults = chkInterim.checked;

    recognition.onstart = () => {
        appendSystemMsg(`recognition has start (language: ${recognition.lang})`);
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (interimTranscript) {
            displayText(interimTranscript, true);
        }

        if (finalTranscript) {
            const cleanText = finalTranscript.trim();
            displayText(cleanText);
        }
    };

    recognition.onerror = (event) => {
        appendSystemMsg(`Error: ${event.error}`);
    };

    recognition.onend = () => {
        if (interimDiv) {
            interimDiv.remove();
            interimDiv = null;
        }

        if (!isManualStop && chkAutoRestart.checked) {
            const delay = parseInt(restartDelayInput.value, 10) || 1000;
            appendSystemMsg(`ended. Will be ${delay}ms restart...`);
            setTimeout(() => {
                if (!isManualStop) {
                    try { recognition.start(); } catch (e) {}
                }
            }, delay);
        } else {
            appendSystemMsg('recognition has ended.');
        }
    }

    try {
        recognition.start();
    } catch (e) {
        appendSystemMsg('Error: ' + e.message);
    }
}

async function quickTranslate(text, toLang = 'en-US', fromLang = 'auto') {
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');

    // 設定查詢參數
    url.search = new URLSearchParams({
      client: 'gtx',
      sl: fromLang,
      tl: toLang,
      dt: 't',
      q: text
    }).toString();

    const response = await fetch(url);
    const data = await response.json();

    let result = data[0][0][0];
    subContainer.insertAdjacentHTML('afterbegin', `<div>${result}</div>`);
  } catch (error) {
    // console.error('translate error:', error);
  }
}

document.getElementById('btn-start').addEventListener('click', initAndStartRecognition);

document.getElementById('btn-stop').addEventListener('click', () => {
    isManualStop = true;
    while (subContainer.firstChild) {
      subContainer.removeChild(subContainer.firstChild);
    }

    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
});

document.getElementById('btn-clear').addEventListener('click', () => {
    sysContainer.innerHTML = '';
    interimDiv = null;
});

window.addEventListener('DOMContentLoaded', () => {
    let arr = ['zh-TW', 'ja', 'en-US'];
    let preferLang = '';
    let transLang = ''
    navigator.languages.forEach((lang) => {
        if (arr.includes(lang)) {
            if (!preferLang) {
                preferLang = lang;
            }
            if (!transLang && transLang != preferLang && lang != preferLang) {
                transLang = lang;
            }
        }
    });
    langSelect.value = preferLang;
    langTran.value = transLang

    initAndStartRecognition();
});