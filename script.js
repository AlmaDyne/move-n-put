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
let currentAudio;
let elAmount;
let k; // Подсчёт элементов

refreshFigures();

refresh.onclick = refreshFigures;
refresh.touchstart = refreshFigures;

innerBank.onmousedown = innerBankStart;
innerBank.touchstart = innerBankStart;

function innerBankStart() {
    innerBank.innerHTML = 'Put in!';
    innerBank.onmouseenter = () => innerBank.innerHTML = 'Put in!';
    innerBank.onmouseleave = () => innerBank.innerHTML = '';
    document.onmouseup = innerBankEnd;
    document.touchend = innerBankEnd;

    function innerBankEnd() {
        innerBank.innerHTML = '';
        innerBank.onmouseenter = null;
        innerBank.onmouseleave = null;
        document.onmouseup = null;
    }
}

soundSwitch.onclick = soundSwitching;
soundSwitch.touchstart = soundSwitching;

function soundSwitching() {
    const speaker = document.getElementById('speaker');

    if (muteSpeaker) {
        this.style.backgroundColor = '#5bdfb3';
        speaker.src = 'images/speaker.png';
        muteSpeaker = false;
    } else {
        this.style.backgroundColor = '#f14646';
        speaker.src = 'images/speaker_mute.png';
        currentAudio.muted = true;
        muteSpeaker = true;
    }
}

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
    const SPEED_MEASURE_INTERVAL = 100; 
    const figures = assorty.querySelectorAll('.figure');
    const space = (n > 1) ? ((docWidth - FIG_WIDTH * n) / (n - 1)) : 0;
    const whoaSounds = [
        'sounds/Whooaaaaa-1.mp3',
        'sounds/Whooaaaaa-2.mp3',
        'sounds/Whooaaaaa-3.mp3'
    ];
    let putPermission = false;
    let lastPuttedBeforePause = null;
    let lastWhoaIndex = null;

    innerBank.style.backgroundColor = '';
    innerBank.innerHTML = '';

    currentAudio = playSound('sounds/Start.mp3');

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
        figure.touchstart = dragAndDrop;
        figure.ondragstart = () => false;
        figure.hidden = false;
    }

    function dragAndDrop(event) {
        const innerBankRect = innerBank.getBoundingClientRect();
        const figure = event.target.closest('.figure');
        const figureInfo = figure.querySelector('.figure-info');
        let figureRect = figure.getBoundingClientRect();
        let figX1 = figureRect.left;
        let figY1 = figureRect.top;
        let figX2 = figX1;
        let figY2 = figY1;
        const figureShiftX = event.clientX - figX1;
        const figureShiftY = event.clientY - figY1;
        const PUT_MESSAGE = 'Whoooaaaaaa!';
        let x1, y1, x2, y2, t1, t2, tInterval, distance, speed;
        let speedMeasureTimer = null;

        innerBank.onmousedown = null;
        innerBank.touchstart = null;
        putPermission = false;
    
        figure.style.zIndex = 10;
        figure.style.filter = 'brightness(90%)';
        figure.style.cursor = 'grabbing';
        assorty.append(figure);

        t1 = t2 = Date.now();
        x1 = x2 = event.clientX;
        y1 = y2 = event.clientY;
        moveAt(x1, y1);
        detectLocation(x1, y1);

        innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
        innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onMouseMove);
        figure.onmouseup = onMouseUp;
        figure.touchend = onMouseUp;
        // Защита при отжатии кнопки мыши за окном - при следующих нажатиях ничего не происходит,
        // пока функция не будет снова назначена при отжатии кнопки мыши на элементе
        figure.onmousedown = null;
        figure.touchstart = null;

        calcSpeed = calcSpeed.bind(this);

        speedMeasureTimer = setInterval(() => {
            console.log(`(${x1}, ${y1}) => (${x2}, ${y2})`);

            innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
            
            if ((x1 != x2) || (y1 != y2)) { // Если указатель мыши двигается
                if ((figX1 != figX2) || (figY1 != figY2)) { // Если фигура двигается
                    calcSpeed();
                    innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';
                } else {
                    t1 = Date.now();
                    innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';
                }
            }
            else { // Если никакого движения нет
                detectLocation(x2, y2);
                t1 = Date.now();
                innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';

            }
        }, SPEED_MEASURE_INTERVAL);

        console.log('\nBegin speed measurement:');
    
        function moveAt(clientX, clientY) {
            let x = clientX - figureShiftX;
            if (x < -(figureRect.width / 2)) x = -(figureRect.width / 2);
            if (x > docWidth - figureRect.width / 2) x = docWidth - figureRect.width / 2;
            figure.style.left = x + 'px';
    
            let y = clientY - figureShiftY;
            if (y < -(figureRect.height / 2)) y = -(figureRect.height / 2);
            if (y > docHeight - figureRect.height / 2) y = docHeight - figureRect.height / 2;
            figure.style.top = y + 'px';
        }
        
        function onMouseMove(event) {
            x2 = event.clientX;
            y2 = event.clientY;
            figureInfo.innerHTML = x2 + ':' + y2;
            moveAt(x2, y2);
            detectLocation(x2, y2);

            figureRect = figure.getBoundingClientRect();
            figX2 = figureRect.left;
            figY2 = figureRect.top;
        }
    
        function onMouseUp(event) {
            clearInterval(speedMeasureTimer);
            document.removeEventListener('mousemove', onMouseMove);
            figure.onmouseup = null;
            figure.touchend = null;
            figure.style.filter = '';
            figure.style.cursor = 'grab';

            console.log('-----Final calculations-----');
            x2 = event.clientX;
            y2 = event.clientY;
            console.log(`(${x1}, ${y1}) => (${x2}, ${y2})`);
            calcSpeed();
    
            if (putPermission) {
                // Аудиоблок рандомных Whooaaaaa при попадании фигуры в банк
                let indexes = [0, 1, 2];
                if (lastWhoaIndex != null) indexes.splice(lastWhoaIndex, 1);
                shuffle(indexes);
                currentAudio = playSound(whoaSounds[indexes[0]]);
                lastWhoaIndex = indexes[0];

                let x = innerBankRect.left + innerBankRect.width / 2 - figureRect.width / 2;
                let y = innerBankRect.top + innerBankRect.height / 2 - figureRect.height / 2;
                figure.style.left = x + 'px';
                figure.style.top = y + 'px';

                innerBank.style.backgroundColor = '#d1eaff';
                innerBank.innerHTML = PUT_MESSAGE;
                figureInfo.innerHTML = '(Putted)';
                figure.style.zIndex = '';
                figure.classList.add('put-in');
                lastPuttedBeforePause = figure;
                putPermission = false;

                const transitionTime = parseFloat(getComputedStyle(assorty.querySelector('.put-in'))
                    .transitionDuration) * 1000;

                putTimer = setTimeout(() => {
                    figure.hidden = true;
                    k--;

                    if (lastPuttedBeforePause == figure) {
                        if (putPermission != true) innerBank.style.backgroundColor = '';
                        if (innerBank.innerHTML == PUT_MESSAGE) innerBank.innerHTML = '';
                        innerBank.onmousedown = innerBankStart;
                        innerBank.touchstart = innerBankStart;
                    }

                    if (!k) finalPutTimer = setTimeout(() => {
                        currentAudio = muteAudio = playSound('sounds/Win.mp3');
                        setTimeout(showRestoreQuestion, 10);
                    }, 200);
                }, transitionTime);
            } else {
                innerBank.onmousedown = innerBankStart;
                innerBank.touchstart = innerBankStart;
                figure.onmousedown = dragAndDrop; // Снова назначить функцию на нажатие, чтобы снять защиту
                figure.touchstart = dragAndDrop;    // Снова назначить функцию на нажатие, чтобы снять защиту
                figureInfo.innerHTML = '(Stopped)';

                innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
                innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';

                setTimeout(() => {
                    if (innerBank.innerHTML != 'Put in!') innerBank.innerHTML = '';
                }, 0);
            }
        }

        function detectLocation(clientX, clientY) {
            figure.hidden = true;
            let elemBelow = document.elementFromPoint(clientX, clientY);
            figure.hidden = false;

            if (
                clientX >= innerBankRect.left && clientX <= (innerBankRect.left + innerBankRect.width) &&
                clientY >= innerBankRect.top && clientY <= (innerBankRect.top + innerBankRect.height)  &&
                elemBelow == innerBank
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

            function enterBank(putElem) {
                putElem.style.backgroundColor = '#634186';
            }
        
            function leaveBank(putElem) {
                putElem.style.backgroundColor = '';
            }
        }

        function calcSpeed() {
            t2 = Date.now();
            tInterval = t2 - t1;
            distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            speed = distance / tInterval;

            console.log(this.id + ' | tInterval = ' + tInterval);
            console.log(this.id + ' | distance = ' + distance);
            console.log(this.id + ' | speed = ' + speed);

            t1 = t2;
            x1 = x2;
            y1 = y2;
            figX1 = figX2;
            figY1 = figY2;
        }

        function showRestoreQuestion() {
            if (confirm('Restore elements?')) arrangeFigures(elAmount)
            else {
                alert('Bye-bye!');
                currentAudio = playSound('sounds/End.mp3');

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
                }, 3524); // Равняется длительности аудио End.mp3
            }
        }
    }
    
    function playSound(audioSource) {
        if (!muteSpeaker) {
            if (muteAudio) setTimeout(() => {
                muteAudio.pause();
                muteAudio = null;
            }, 50);
    
            let audio = new Audio(audioSource);
            audio.preload = true;
            audio.play();

            return audio;
        }
    }
}
