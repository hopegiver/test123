// 게임 상수
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// 테트로미노 블록 정의 (7가지 형태)
const TETROMINOS = {
    I: {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#00f0f0'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#f0f000'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#a000f0'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#00f000'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#f00000'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: '#0000f0'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: '#f0a000'
    }
};

// 게임 상태
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameRunning = false;
let gamePaused = false;

// Canvas 요소
const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// DOM 요소
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// 게임 보드 초기화
function initBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// 랜덤 테트로미노 생성
function createPiece() {
    const types = Object.keys(TETROMINOS);
    const type = types[Math.floor(Math.random() * types.length)];
    const tetromino = TETROMINOS[type];
    
    return {
        shape: tetromino.shape.map(row => [...row]),
        color: tetromino.color,
        x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
        y: 0
    };
}

// 블록 회전 (시계 방향 90도)
function rotatePiece(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    return {
        ...piece,
        shape: rotated
    };
}

// 충돌 감지
function isCollision(piece, board, dx = 0, dy = 0) {
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    for(let y = 0; y < piece.shape.length; y++) {
        for(let x = 0; x < piece.shape[y].length; x++) {
            if(piece.shape[y][x]) {
                const boardX = newX + x;
                const boardY = newY + y;
                
                // 벽 충돌
                if(boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return true;
                }
                
                // 바닥 충돌
                if(boardY < 0) {
                    continue;
                }
                
                // 다른 블록과 충돌
                if(board[boardY][boardX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 블록을 보드에 고정
function mergePiece(piece, board) {
    for(let y = 0; y < piece.shape.length; y++) {
        for(let x = 0; x < piece.shape[y].length; x++) {
            if(piece.shape[y][x]) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if(boardY >= 0) {
                    board[boardY][boardX] = piece.color;
                }
            }
        }
    }
}

// 완성된 라인 제거
function clearLines(board) {
    let linesCleared = 0;
    
    for(let y = ROWS - 1; y >= 0; y--) {
        if(board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // 같은 라인을 다시 확인
        }
    }
    
    return linesCleared;
}

// 점수 계산
function updateScore(linesCleared) {
    const points = [0, 100, 300, 500, 800];
    score += points[linesCleared] * level;
    lines += linesCleared;
    
    // 레벨 업 (10줄마다)
    const newLevel = Math.floor(lines / 10) + 1;
    if(newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// 게임 보드 그리기
function drawBoard() {
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 그리드 그리기
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for(let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
        ctx.stroke();
    }
    for(let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // 고정된 블록 그리기
    for(let y = 0; y < ROWS; y++) {
        for(let x = 0; x < COLS; x++) {
            if(board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
    
    // 현재 블록 그리기
    if(currentPiece) {
        for(let y = 0; y < currentPiece.shape.length; y++) {
            for(let x = 0; x < currentPiece.shape[y].length; x++) {
                if(currentPiece.shape[y][x]) {
                    drawBlock(
                        ctx,
                        currentPiece.x + x,
                        currentPiece.y + y,
                        currentPiece.color
                    );
                }
            }
        }
    }
}

// 다음 블록 그리기
function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if(nextPiece) {
        const blockSize = 20;
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;
        
        for(let y = 0; y < nextPiece.shape.length; y++) {
            for(let x = 0; x < nextPiece.shape[y].length; x++) {
                if(nextPiece.shape[y][x]) {
                    drawBlock(
                        nextCtx,
                        (offsetX / blockSize) + x,
                        (offsetY / blockSize) + y,
                        nextPiece.color,
                        blockSize
                    );
                }
            }
        }
    }
}

// 개별 블록 그리기
function drawBlock(context, x, y, color, size = BLOCK_SIZE) {
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    
    // 하이라이트 효과
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(x * size + 1, y * size + 1, size - 2, size / 3);
    
    // 그림자 효과
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(x * size + 1, y * size + size - size / 3, size - 2, size / 3);
}

// 블록 이동
function movePiece(dx, dy) {
    if(!currentPiece) return;
    
    if(!isCollision(currentPiece, board, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// 블록 회전
function rotateCurrentPiece() {
    if(!currentPiece) return;
    
    const rotated = rotatePiece(currentPiece);
    if(!isCollision(rotated, board)) {
        currentPiece = rotated;
    } else {
        // 벽 킥 (wall kick) - 회전 시 벽에 닿으면 옆으로 이동 시도
        if(!isCollision(rotated, board, -1, 0)) {
            currentPiece = rotated;
            currentPiece.x -= 1;
        } else if(!isCollision(rotated, board, 1, 0)) {
            currentPiece = rotated;
            currentPiece.x += 1;
        }
    }
}

// 블록 낙하
function dropPiece() {
    if(!movePiece(0, 1)) {
        mergePiece(currentPiece, board);
        const linesCleared = clearLines(board);
        if(linesCleared > 0) {
            updateScore(linesCleared);
        }
        
        currentPiece = nextPiece;
        nextPiece = createPiece();
        
        // 게임 오버 체크
        if(isCollision(currentPiece, board)) {
            gameOver();
        }
    }
}

// 게임 오버
function gameOver() {
    gameRunning = false;
    gamePaused = false;
    finalScoreElement.textContent = score;
    gameOverElement.classList.add('show');
    startBtn.style.display = 'none';
    resetBtn.style.display = 'block';
}

// 게임 초기화
function initGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropCounter = 0;
    dropInterval = 1000;
    gameRunning = true;
    gamePaused = false;
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
    
    gameOverElement.classList.remove('show');
    startBtn.style.display = 'none';
    resetBtn.style.display = 'block';
}

// 게임 루프
function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if(gameRunning && !gamePaused) {
        dropCounter += deltaTime;
        
        if(dropCounter > dropInterval) {
            dropPiece();
            dropCounter = 0;
        }
        
        drawBoard();
        drawNextPiece();
    }
    
    requestAnimationFrame(gameLoop);
}

// 키보드 이벤트
document.addEventListener('keydown', (e) => {
    if(!gameRunning || gamePaused) {
        if(e.code === 'Space') {
            gamePaused = !gamePaused;
        }
        return;
    }
    
    switch(e.code) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if(movePiece(0, 1)) {
                score += 1;
                scoreElement.textContent = score;
            }
            break;
        case 'ArrowUp':
            rotateCurrentPiece();
            break;
        case 'Space':
            gamePaused = !gamePaused;
            break;
    }
    
    e.preventDefault();
});

// 버튼 이벤트
startBtn.addEventListener('click', () => {
    initGame();
    gameLoop();
});

resetBtn.addEventListener('click', () => {
    initGame();
    gameLoop();
});

// 초기 화면 그리기
initBoard();
drawBoard();
drawNextPiece();

