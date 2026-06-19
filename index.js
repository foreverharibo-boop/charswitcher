// Quick Character Extension
// Shows current character avatar above chat input; click to switch characters

const MODULE_NAME = 'quick-character';

// ST 최신 권장 방식: SillyTavern.getContext() 사용
// import 대신 getContext로 모든 ST 내부 접근
function getCtx() {
    return SillyTavern.getContext();
}

// 캐릭터 썸네일 URL 생성
function getAvatarUrl(character) {
    if (!character?.avatar) return 'img/ai4.png';
    try {
        const ctx = getCtx();
        if (typeof ctx.getThumbnailUrl === 'function') {
            return ctx.getThumbnailUrl('avatar', character.avatar);
        }
    } catch { /* fallback */ }
    return `thumbnails/avatar/${character.avatar}`;
}

// UI 생성 및 주입
function createQuickCharacterUI() {
    if ($('#quick-character-container').length) return;

    const container = $(`
        <div id="quick-character-container">
            <div id="qc-current-avatar" title="캐릭터 전환">
                <img id="qc-current-img" src="img/ai4.png" alt="현재 캐릭터" />
            </div>
            <div id="qc-picker" class="qc-hidden">
                <div id="qc-picker-inner"></div>
            </div>
        </div>
    `);

    $('#send_form').before(container);

    $('#qc-current-avatar').on('click', function (e) {
        e.stopPropagation();
        togglePicker();
    });

    $(document).on('click.quickcharacter', function () {
        closePicker();
    });

    $('#qc-picker').on('click', function (e) {
        e.stopPropagation();
    });

    updateCurrentAvatar();
}

function togglePicker() {
    const picker = $('#qc-picker');
    if (picker.hasClass('qc-hidden')) {
        populatePicker();
        picker.removeClass('qc-hidden').addClass('qc-visible');
    } else {
        closePicker();
    }
}

function closePicker() {
    $('#qc-picker').removeClass('qc-visible').addClass('qc-hidden');
}

function populatePicker() {
    const inner = $('#qc-picker-inner');
    inner.empty();

    const ctx = getCtx();
    const chars = ctx.characters ?? [];
    const currentChid = ctx.characterId;

    if (chars.length === 0) {
        inner.append('<div class="qc-empty">캐릭터가 없습니다</div>');
        return;
    }

    const aiChars = chars.filter(c => c && c.name && c.avatar && c.avatar !== 'none');

    aiChars.forEach((char) => {
        const charIndex = chars.indexOf(char);
        const isActive = charIndex === currentChid;
        const avatarUrl = getAvatarUrl(char);
        const safeName = $('<div>').text(char.name).html();

        const item = $(`
            <div class="qc-char-item${isActive ? ' qc-active' : ''}"
                 data-index="${charIndex}"
                 title="${safeName}">
                <img src="${avatarUrl}" alt="${safeName}"
                     onerror="this.src='img/ai4.png'" />
                <span class="qc-char-name">${safeName}</span>
            </div>
        `);

        item.on('click', function () {
            selectCharacter(parseInt($(this).data('index')));
        });

        inner.append(item);
    });
}

async function selectCharacter(charIndex) {
    const ctx = getCtx();
    const char = ctx.characters?.[charIndex];
    if (!char) return;

    closePicker();

    try {
        // ST 공식 권장: openCharById
        if (typeof ctx.openCharById === 'function') {
            await ctx.openCharById(charIndex);
        } else {
            // fallback: 사이드바 캐릭터 카드 직접 클릭
            const charCard = $(`.character_select[chid="${charIndex}"]`);
            if (charCard.length) {
                charCard.trigger('click');
            } else {
                console.warn(`[QuickCharacter] 캐릭터 카드를 찾을 수 없음: index ${charIndex}`);
                return;
            }
        }

        setTimeout(updateCurrentAvatar, 400);
    } catch (err) {
        console.error('[QuickCharacter] 캐릭터 전환 실패:', err);
    }
}

function updateCurrentAvatar() {
    const ctx = getCtx();
    const chars = ctx.characters ?? [];
    const currentChid = ctx.characterId;
    const current = chars[currentChid];
    const img = $('#qc-current-img');

    if (current) {
        img.attr('src', getAvatarUrl(current));
        img.attr('alt', current.name);
        $('#qc-current-avatar').attr('title', `캐릭터 전환 (현재: ${current.name})`);
    } else {
        img.attr('src', 'img/ai4.png');
        img.attr('alt', '캐릭터 없음');
        $('#qc-current-avatar').attr('title', '캐릭터 전환');
    }
}

function registerEventListeners() {
    const ctx = getCtx();
    const { eventSource, event_types } = ctx;

    if (eventSource && event_types) {
        eventSource.on(event_types.CHAT_CHANGED, updateCurrentAvatar);
        eventSource.on(event_types.CHARACTER_SELECTED, updateCurrentAvatar);
    }
}

// 초기화
jQuery(async () => {
    // APP_READY 이후 실행되도록
    const ctx = getCtx();
    const { eventSource, event_types } = ctx;

    if (eventSource && event_types) {
        eventSource.on(event_types.APP_READY, () => {
            createQuickCharacterUI();
            registerEventListeners();
        });
        // 이미 앱이 로드된 상태면 바로 실행 (APP_READY는 auto-fire됨)
    } else {
        // fallback
        createQuickCharacterUI();
    }

    console.log('[QuickCharacter] Extension loaded ✓');
});
