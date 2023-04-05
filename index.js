// 1-bit archive
// sweatersjpg

let pageP;
let drawingP;
let pageNum = "";

let url = window.location.href.split('?')[0];

function setup() {
    let cnv = createCanvas(656, 656);
    cnv.parent("cnvdiv");
    let div = select('#cnvdiv').size(656, 656 - 8);

    pageP = select('#page');
    drawingP = select('#drawingUI');
    drawingP.hide();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('p')) {
        pageNum = fromHexView(urlParams.get('p'));
    } else {
        pageNum = divideBase256(randomBase256(8), 64);
        // window.location.href = url + "?p=" + pageNum;
    }

    pageP.elt.innerText = toHexView(pageNum);

    frameRate(30);
}

let searchMode = false;

let px = [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0, 0, 0,
    0, 1, 0, 0, 1, 0, 0, 1,
    0, 1, 0, 0, 1, 1, 1, 1,
    0, 1, 1, 1, 0, 1, 0, 1,
    0, 1, 1, 1, 1, 1, 1, 1,
    0, 1, 1, 1, 1, 1, 1, 0,
    0, 1, 0, 0, 1, 0, 1, 0
]

let brush = 1;

let selected = false;

let mouseJustReleased = false;

function draw() {
    background(0, 0, 0, 40);

    if (searchMode) {

        stroke(255);
        fill(0);
        rect(14, 14, width - 14 * 2);

        let x = floor((mouseX - 16) / (78));
        let y = floor((mouseY - 16) / (78));

        if (x >= 0 && x < 8 && y >= 0 && y < 8 && mouseIsPressed) {
            let i = y * 8 + x;

            px[i] = brush;
        }

        for (let i = 0; i < 64; i++) {
            let x = (i % 8) * (78);
            let y = floor(i / 8) * (78);

            fill(px[i] ? 255 : 0);
            noStroke();
            rect(16 + x, 16 + y, 78);
        }

        // if (x >= 0 && x < 8 && y >= 0 && y < 8) {
        //     stroke(255);
        //     fill(0);
        //     rect(16 + x * (64 + 16), 16 + y * (64 + 16), 64, 64);
        // }

        return;
    }

    let index = multiplyBase256(pageNum, 64);

    let mx = (mouseX - 16);
    let my = (mouseY - 16);

    for (let i = 0; i < 64; i++) {
        let x = (i % 8) * (64 + 16);
        let y = floor(i / 8) * (64 + 16);

        let pressed = false;

        if (mx > x && mx < x + 64 && my > y && my < y + 64) {
            stroke(255);

            fill(0);
            rect(x - 2 + 16, y - 2 + 16, 64 + 4, 64 + 4);
            if (mouseJustReleased) pressed = true;
        }

        noStroke();
        let pixels = drawSprite(index, 16 + x, 16 + y, 64);

        if (pressed) {
            search();
            px = pixels;
            print(pixels);
        }

        index = addBase256(index, "1");
    }

    mouseJustReleased = false;
    // noLoop();
}

function mousePressed() {
    let x = floor((mouseX - 16) / (78));
    let y = floor((mouseY - 16) / (78));

    if (x < 0 || x >= 8 || y < 0 || y >= 8) return;

    let i = y * 8 + x;
    brush = (px[i] + 1) % 2;
}

function mouseReleased() {
    mouseJustReleased = true;
}

function keyPressed() {
    if (keyCode == 2 || keyCode == 83) search();
    if (keyCode == 82) randomPage();

    if (keyCode == LEFT_ARROW) prev();
    if (keyCode == RIGHT_ARROW) next();

    if (!searchMode) return;
    if (keyCode == 27) search();
    if (keyCode == 13) findDrawing();
    if (keyCode == 67) clearDrawing();
    if (keyCode == 73) invertDrawing();
}

function search() {
    if (!searchMode) {
        searchMode = true;
        loop();
        drawingP.show();
    } else {
        searchMode = false;
        drawingP.hide();
    }
}

function findDrawing() {
    let n = [];

    for (let i = 0; i < 64; i += 8) n.push(parseInt(px.slice(i, i + 8).reverse().join(""), 2));
    n = n.reverse();

    let index = decrypt(n.join(":"));
    window.location.href = linkToPage(divideBase256(index, 64));
}

function clearDrawing() {
    px = px.map(x => 0);
}

function invertDrawing() {
    px = px.map(x => (x + 1) % 2);
}

function next() {
    pageNum = addBase256(pageNum, 1);
    if (pageNum == "4:0:0:0:0:0:0:0") pageNum = "0:0:0:0:0:0:0:0";
    window.location.href = linkToPage(pageNum);
}

function prev() {
    if (pageNum == "0:0:0:0:0:0:0:0") pageNum = "4:0:0:0:0:0:0:0";
    window.location.href = linkToPage(subtractOneBase256(pageNum));
}

function randomPage() {
    // reload without params
    window.location.href = url;
}

function linkToPage(page) {
    return url + "?p=" + toHexView(page);
}

// --- sprites ---

function drawSprite(n, X, Y, w) {
    let out = [];

    n = encrypt(n);
    n = n.split(":").map((x) => toBin(parseInt(x)));
    w /= 8;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let c = n[y].charAt(x);
            out.unshift(parseInt(c));
            if (!parseInt(c)) continue;
            fill(c * 255);
            rect(X + (7 - x) * w, Y + (7 - y) * w, w, w);
        }
    }

    return out;
}

function toBin(x) {
    x = (x >>> 0).toString(2);
    while (x.length < 8) x = "0" + x;
    return x;
}

// --- base256 stuff ---

function toHexView(n) {
    n = n.split(":").map((x) => parseInt(x));
    for (let i = 0; i < 8; i++) {
        n[i] = n[i].toString(16);
        if (n[i].length < 2) n[i] = "0" + n[i];
    }
    return n.join("");
}

function fromHexView(n) {
    n = n.match(/.{2}/g);
    for (let i = 0; i < 8; i++) n[i] = parseInt(n[i], 16);
    return n.join(":");
}

let cypher = [
    12, 22, 235, 226, 30, 111, 196, 119, 34, 97, 113, 175, 180, 217, 54, 128, 46, 123, 246, 165, 242, 62, 225, 25, 27, 73, 149, 5, 101, 223, 249, 114, 132, 145, 161, 163, 250, 137, 252, 42, 146, 85, 156, 26, 202, 96, 148, 98, 56, 185, 194, 131, 198, 39, 108, 100, 155, 157, 31, 17, 90, 141, 169, 116, 219, 76, 38, 191, 173, 150, 28, 208, 251, 37, 248, 74, 112, 104, 190, 53, 21, 59, 240, 183, 174, 136, 109, 45, 7, 179, 107, 171, 177, 4, 10, 231, 29, 65, 199, 121, 63, 71, 19, 41, 215, 40, 138, 152, 254, 44, 130, 78, 159, 83, 124, 92, 207, 178, 224, 1, 164, 51, 35, 245, 43, 89, 200, 20, 66, 220, 72, 142, 47, 209, 120, 143, 80, 151, 69, 81, 55, 125, 172, 82, 247, 201, 3, 203, 99, 222, 139, 50, 11, 158, 70, 61, 233, 193, 197, 2, 144, 229, 167, 212, 68, 105, 48, 106, 189, 103, 243, 184, 241, 238, 58, 93, 64, 67, 230, 210, 154, 244, 115, 122, 60, 234, 186, 239, 102, 181, 211, 18, 227, 134, 232, 213, 95, 0, 253, 118, 147, 204, 218, 24, 33, 153, 15, 195, 14, 237, 32, 160, 188, 49, 88, 9, 228, 117, 162, 91, 187, 8, 84, 86, 57, 77, 182, 79, 23, 214, 206, 170, 168, 192, 133, 13, 52, 255, 36, 110, 135, 236, 127, 87, 166, 6, 16, 176, 94, 221, 205, 140, 126, 75, 129, 216
];

function encrypt(n) {
    n = n.split(":").map((x) => parseInt(x));

    let key = n[n.length - 1];

    for (let i = 0; i < n.length - 1; i++) {
        n[i] = cypher[(n[i] + key) % 256];
    }

    return n.join(":");
}

function decrypt(n) {
    n = n.split(":").map((x) => parseInt(x));

    let key = n[n.length - 1];

    for (let i = 0; i < n.length - 1; i++) {
        n[i] = cypher.indexOf(n[i]) - key;
        if (n[i] < 0) n[i] += 256;
    }

    return n.join(":");
}

function randomBase256(digits) {
    let out = "" + floor(random(256));
    for (let i = 1; i < digits; i++) out += ":" + floor(random(256));
    return out;
}

function subtractOneBase256(n) {
    let out = "";
    n = n.split(":").map((x) => parseInt(x));
    out = n.pop() - 1;

    if (out < 0) out = subtractOneBase256(n.join(":")) + (n.length ? ":" : "") + 255;
    else out = n.join(":") + (n.length ? ":" : "") + out;

    return out;
}

function addBase256(n, a) {
    let out = "";
    n = n.split(":").map((x) => parseInt(x)).reverse();

    if (typeof a !== "string") a = decimalToBase256(a);
    a = a.split(":").map((x) => parseInt(x)).reverse();

    let c = 0;

    for (let i = 0; i < n.length; i++) {
        let x = decimalToBase256(n[i] + (i >= a.length ? 0 : a[i]) + c).split(":");

        if (x.length > 1) {
            c = parseInt(x[0]);
            out = x[1] + (i ? ":" : "") + out;
        } else {
            c = 0;
            out = x[0] + (i ? ":" : "") + out;
        }

    }

    return (c ? c + (out.length ? ":" : "") : "") + out;
}

function multiplyBase256(n, m) {
    let out = n;
    for (let i = 1; i < m; i++) out = addBase256(out, n);
    return out;
}

function divideBase256(n, d) {
    let out = "";
    n = n.split(":").map((x) => parseInt(x));

    let r = 0;
    for (let i = 0; i < n.length; i++) {
        let x = base256ToDecimal(r + ":" + n[i]);

        let o = floor(x / d);
        r = x - o * 64;

        out += (i ? ":" : "") + o;
    }

    return out;
}

function base256ToDecimal(n) {
    n = n.split(":");
    return n.reduce((a, x, i) => a + parseInt(x) * pow(256, n.length - 1 - i), 0);
}

function decimalToBase256(d) {
    let out = (d % 256) + "";
    d = floor(d / 256);

    while (d) {
        out = (d % 256) + ":" + out;
        d = floor(d / 256);
    }

    return out;
}
