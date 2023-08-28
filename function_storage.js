export { shuffle };

function clickCount(i, elem) {
    if ((String(i).at(-1) === '2' || String(i).at(-1) === '3' || String(i).at(-1) === '4') && 
        String(i).at(-2) !== '1') {
            elem.innerHTML = `(Нажато ${i} раза)`;
    } else {
        elem.innerHTML = `(Нажато ${i} раз)`;
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function randomNumber(min, max) {
    return min + Math.random() * (max - min);
}

function randomInteger(min, max) {
    let random = min + Math.random() * (max + 1 - min);
    return Math.floor(random);
}

function scrollWidth() {
    let div = document.createElement('div');

    div.style.overflowY = 'scroll';
    div.style.width = '50px';
    div.style.height = '50px';

    document.body.append(div);
    let scrollWidth = div.offsetWidth - div.clientWidth;

    div.remove();

    return scrollWidth;
}
