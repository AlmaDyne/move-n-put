'use strict';

import { shuffle } from "./function_storage.js";

const innerBank = document.getElementById('inner-bank');
const figAmount = document.getElementById('figures-amount');
const assorty = document.getElementById('assorted-figures');
const refresh = document.getElementById('refresh-button');
const soundSwitch = document.getElementById('sound-switch');
const docHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
);
const docWidth = Math.max(
    document.body.scrollWidth, document.documentElement.scrollWidth,
    document.body.offsetWidth, document.documentElement.offsetWidth,
    document.body.clientWidth, document.documentElement.clientWidth
);
let putTimer = null;
let finalPutTimer = null;
let muteAudio = null;
let muteSpeaker = false;
let currentSound;
let k; // Подсчёт элементов
let elAmount;

refreshFigures();

refresh.onclick = () => refreshFigures();

innerBank.onmousedown = () => {
    innerBank.innerHTML = 'Put in!';
    document.onmouseup = () => innerBank.innerHTML = '';
};


soundSwitch.onclick = () => {
    const speaker = document.getElementById('speaker');

    if (muteSpeaker) {
        soundSwitch.style.backgroundColor = '#5bdfb3';
        speaker.src = 'images/speaker.png';
        muteSpeaker = false;
    } else {
        soundSwitch.style.backgroundColor = '#f14646';
        speaker.src = 'images/speaker_mute.png';
        currentSound.muted = true;
        muteSpeaker = true;
    }
};

function refreshFigures() {
    k = 0;
    elAmount = createFigures();
    arrangeFigures(elAmount);
}

function createFigures() {
    const figNames = ['square', 'triangle', 'circle', 'rectangle', 'ellipse', 'rhombus'];
    const colors = {
        yellow: '#fbff00',
        green: '#65ff57',
        pink: '#ff6ec7',
        blue: '#6d77ff',
        brown: '#ffb03b',
        skyblue: '#7affff'
    };

    clearTimeout(putTimer);
    clearTimeout(finalPutTimer);
    assorty.innerHTML = '';

    const colNames = [];
    for (let key in colors) {
        colNames.push(key);
    }
    shuffle(colNames);
    shuffle(figNames);

    if (+figAmount.value < figAmount.min) figAmount.value = figAmount.min;
    if (+figAmount.value > figAmount.max) figAmount.value = figAmount.max;
    const n = figAmount.value;

    for (let i = 0; i < n; i++) {
        let fig = document.createElement('div');
        fig.id = figNames[i];
        fig.className = 'figure';
        fig.insertAdjacentHTML('afterbegin', '<p><b>Move and put!</b></p>');
        fig.insertAdjacentHTML('beforeend', '<p class="figure-info">(Not moved)</p>');
        assorty.append(fig);

        // Новый стайл-документ для применения рандомного цвета к псевдоэлементам
        let colorStyle = document.createElement('style');
        colorStyle.innerHTML = `#${fig.id}::after {
            background-color: ${colors[colNames[i]]};
        }`;
        document.querySelector('head').append(colorStyle);
    }

    return n;
}

function arrangeFigures(n) {
    const FIG_WIDTH = parseInt(getComputedStyle(document.querySelector('.figure')).width);
    const figures = assorty.querySelectorAll('.figure');
    const space = (n > 1) ? ((docWidth - FIG_WIDTH * n) / (n - 1)) : 0;
    const whoaSounds = [
        'sounds/Whooaaaaa-1.wav',
        'sounds/Whooaaaaa-2.wav',
        'sounds/Whooaaaaa-3.wav'
    ];
    let lastWhoaIndex = null;
    let putPermission = null;
    let colorChangeTimer = null;

    currentSound = playSound('sounds/Start.wav');

    for (let figure of figures) {
        k++;
        const figureInfo = figure.querySelector('.figure-info');
        figureInfo.innerHTML = '(Not moved)';

        if (figure.classList.contains('put-in')) figure.classList.remove('put-in');

        figure.style.top = '';
        figure.style.bottom = 0;
        figure.style.right = '';
        figure.style.left = (n == 1) ? `calc(50% - ${FIG_WIDTH}px / 2)` :
            ((space + FIG_WIDTH) * (k - 1) + 'px');
        
        figure.onmousedown = dragAndDrop;
        figure.ondragstart = () => false;
        figure.hidden = false;
    }

    function dragAndDrop(event) {
        const innerBankRect = innerBank.getBoundingClientRect();
        const figure = event.target.closest('.figure');
        const figureInfo = figure.querySelector('.figure-info');
        const figureRect = figure.getBoundingClientRect();
        const figureShiftX = event.clientX - figureRect.left;
        const figureShiftY = event.clientY - figureRect.top;
        putPermission = false;
    
        figure.style.zIndex = 10;
        figure.style.filter = 'brightness(90%)';
        figure.style.cursor = 'grabbing';
        assorty.append(figure);
    
        moveAt(event.pageX, event.pageY);
    
        document.addEventListener('mousemove', onMouseMove);
    
        figure.onmouseup = onMouseUp;
    
        // Защита при отжатии кнопки мыши за окном - при следующих нажатиях ничего не происходит,
        // пока функция не будет снова назначена при отжатии кнопки мыши на элементе
        figure.onmousedown = null;
    
        function moveAt(pageX, pageY) {
            let x = pageX - figureShiftX;
            if (x < -(figureRect.width / 2)) x = -(figureRect.width / 2);
            if (x > docWidth - figureRect.width / 2) x = docWidth - figureRect.width / 2;
            figure.style.left = x + 'px';
    
            let y = pageY - figureShiftY;
            if (y < -(figureRect.height / 2)) y = -(figureRect.height / 2);
            if (y > docHeight - figureRect.height / 2) y = docHeight - figureRect.height / 2;
            figure.style.top = y + 'px';
        }
        
        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
            figureInfo.innerHTML = event.pageX + ':' + event.pageY;

            if (
                event.clientX >= innerBankRect.left && event.clientX <= (innerBankRect.left + innerBankRect.width) &&
                event.clientY >= innerBankRect.top && event.clientY <= (innerBankRect.top + innerBankRect.height)
            ) {
                if (!putPermission) {
                    enterBank(innerBank);
                    putPermission = true;
                }
            } else {
                if (putPermission) {
                    leaveBank(innerBank);
                    putPermission = false;
                }
            }
        }

        function enterBank(putElem) {
            putElem.style.backgroundColor = '#634186';
        }
    
        function leaveBank(putElem) {
            putElem.style.backgroundColor = '';
        }
    
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            figure.onmouseup = null;
            figure.style.filter = '';
            figure.style.cursor = 'grab';
    
            if (putPermission) {
                clearTimeout(colorChangeTimer);
                
                // Аудиоблок рандомных Whooaaaaa при попадании фигуры в банк
                let indexes = [0, 1, 2];
                if (lastWhoaIndex != null) indexes.splice(lastWhoaIndex, 1);
                shuffle(indexes);
                currentSound = playSound(whoaSounds[indexes[0]]);
                lastWhoaIndex = indexes[0];

                let x = innerBankRect.left + innerBankRect.width / 2 - figureRect.width / 2;
                let y = innerBankRect.top + innerBankRect.height / 2 - figureRect.height / 2;
                figure.style.left = x + 'px';
                figure.style.top = y + 'px';

                leaveBank(innerBank);
                innerBank.style.backgroundColor = '#d1eaff';

                figureInfo.innerHTML = 'Whoooaaaaaa!';
                figure.classList.add('put-in');
                const transTime = parseFloat(getComputedStyle(assorty.querySelector('.put-in')).transitionDuration) * 1000;
                putPermission = false;

                putTimer = setTimeout(() => {
                    figure.hidden = true;
                    k--;

                    if (!k) finalPutTimer = setTimeout(() => {
                        currentSound = muteAudio = playSound('sounds/Win.wav');
                        setTimeout(showRestoreQuestion, 10);
                    }, 200);
                }, transTime);

                colorChangeTimer = setTimeout(() => {
                    if (!putPermission) innerBank.style.backgroundColor = '';
                }, transTime);
            } else {
                figure.onmousedown = dragAndDrop; // Снова назначить функцию на нажатие, чтобы снять защиту
                figureInfo.innerHTML = '(Stopped)';
            }
        }
    
        function showRestoreQuestion() {
            if (confirm('Restore elements?')) arrangeFigures(elAmount)
            else {
                alert('Bye-bye!');
                currentSound = playSound('sounds/End.wav');

                let endScreen = document.createElement('div');
                endScreen.style.cssText = `
                    width: 100%;
                    height: 100%;
                    background-color: #000;
                    position: absolute;
                    top: -100%;
                    z-index: 100;
                    transition: 1000ms ease-in-out;
                `;
                document.body.append(endScreen);

                setTimeout(() => endScreen.style.top = 0, 0);
                setTimeout(() => {
                    document.body.innerHTML = '';
                    document.body.style.background = '#000';
                }, 3524); // Равняется длительности аудио End.wav
            }
        }
    }
    
    function playSound(audioSource) {
        if (!muteSpeaker) {
            if (muteAudio) setTimeout(() => {
                muteAudio.pause();
                muteAudio = null;
            }, 50);
    
            let sound = new Audio(audioSource);
            sound.play();
    
            return sound;
        }
    }
}
