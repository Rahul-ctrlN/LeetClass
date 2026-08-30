const state = {
    students: [],
    filter: 'all',
    activeId: null
};

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    [...document.querySelectorAll(selector)];

const api = async (url, options = {}) => {

    const response =
        await fetch(url, options);

    const data =
        response.status === 204
            ? null
            : await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error ||
            'Something went wrong.'
        );
    }

    return data;
};

const esc = value =>
    String(value ?? '').replace(
        /[&<>"']/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );

const initials = name =>
    String(name || 'Student')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'S';

const avatar = student => {

    const label =
        `${esc(student.name)} avatar`;

    const fallback =
        `<span class="avatar-initials"${
            student.statistics.avatar
                ? ' hidden'
                : ''
        }>${initials(student.name)}</span>`;

    const image =
        student.statistics.avatar
            ? `<img
                src="${esc(student.statistics.avatar)}"
                alt="${label}"
                onerror="
                    this.hidden=true;
                    this.nextElementSibling.hidden=false
                "
              >`
            : '';

    return `
        <span
            class="avatar"
            aria-label="${label}"
        >
            ${image}
            ${fallback}
        </span>
    `;
};

const pretty = number =>
    number == null
        ? '—'
        : Number(number).toLocaleString();

const date = iso => {

    const delta =
        Date.now() -
        new Date(iso);

    const mins =
        Math.floor(delta / 60000);

    if (mins < 1)
        return 'Just updated';

    if (mins < 60)
        return `${mins}m ago`;

    if (mins < 1440)
        return `${Math.floor(mins / 60)}h ago`;

    return new Date(iso)
        .toLocaleDateString(
            undefined,
            {
                month: 'short',
                day: 'numeric'
            }
        );
};

const summaryIcon = type =>
    ({
        students:
            '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3 2.3-5 5.5-5s5 2 5.5 5M16 5.5a3 3 0 0 1 0 5M16.5 14c2.6.2 4 1.9 4.5 4"/>',

        code:
            '<svg viewBox="0 0 24 24"><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/>',

        chart:
            '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',

        check:
            '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.3 2.3 4.7-4.7"/>',

        award:
            '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-1 7 4.5-2 4.5 2-1-7"/>'
    })[type];

function toast(message, bad = false) {

    const node = $('#toast');

    node.textContent = message;

    node.style.background =
        bad ? '#a64c4c' : '';

    node.classList.add('show');

    setTimeout(
        () =>
            node.classList.remove(
                'show'
            ),
        3300
    );
}

function summary() {

    const s = state.students;

    const total =
        s.reduce(
            (n, x) =>
                n +
                Number(
                    x.statistics.totalSolved || 0
                ),
            0
        );

    const average =
        s.length
            ? Math.round(total / s.length)
            : 0;

    const acceptance =
        s.filter(
            x =>
                x.statistics.acceptanceRate != null
        );

    const avgAcceptance =
        acceptance.length
            ? (
                acceptance.reduce(
                    (n, x) =>
                        n +
                        Number(
                            x.statistics.acceptanceRate
                        ),
                    0
                ) /
                acceptance.length
            ).toFixed(1) + '%'
            : '—';

    const top =
        s[0]?.name || '—';

    $('#sideCount').textContent =
        s.length;

    $('#summary').innerHTML = [

        [
            'students',
            'Students',
            s.length
        ],

        [
            'code',
            'Total problems',
            pretty(total)
        ],

        [
            'chart',
            'Average problems',
            pretty(average)
        ],

        [
            'check',
            'Average acceptance',
            avgAcceptance
        ],

        [
            'award',
            'Top performer',
            esc(top)
        ]

    ]
        .map(
            (card, i) =>
                `
                <article class="summary-card">

                    <span class="sicon">
                        ${summaryIcon(card[0])}
                    </span>

                    <label>
                        ${card[1]}
                    </label>

                    <strong
                        class="${i === 4
                            ? 'small-name'
                            : ''}"
                    >
                        ${card[2]}
                    </strong>

                </article>
                `
        )
        .join('');

    $('#studentSub').textContent =
        s.length
            ? `${s.length} student${
                s.length === 1
                    ? ''
                    : 's'
            } in your classroom`
            : 'Start building your coding community';
}

function studentCard(student) {

    const stats =
        student.statistics || {};

    const scale =
        Math.min(
            100,
            Number(stats.totalSolved || 0) /
                900 *
                100
        );

    const isActive =
        stats.activeToday === true;

    const statusClass =
        isActive
            ? 'active'
            : 'inactive';

    const statusLabel =
        isActive
            ? 'Submitted today'
            : 'No submission today';

    return `

        <article
            class="student-card"
            data-id="${esc(student.id)}"
        >

            <span class="rank">
                #${String(
                    student.rank
                ).padStart(2, '0')}
            </span>


            <!-- TOP RIGHT STATUS + MENU -->

            <div class="student-card-actions">

                <span
                    class="student-status ${statusClass}"
                    title="${statusLabel}"
                    aria-label="${statusLabel}"
                ></span>

                <button
                    class="more"
                    type="button"
                    aria-label="Student menu"
                    data-menu="${esc(student.id)}"
                >
                    ⋮
                </button>

            </div>


            <!-- MENU -->

            <div
                class="menu"
                id="menu-${esc(student.id)}"
            >

                <button
                    type="button"
                    data-action="view"
                    data-id="${esc(student.id)}"
                >
                    View profile
                </button>

                <button
                    type="button"
                    data-action="refresh"
                    data-id="${esc(student.id)}"
                >
                    Refresh statistics
                </button>

                <button
                    type="button"
                    class="danger"
                    data-action="remove"
                    data-id="${esc(student.id)}"
                >
                    Remove student
                </button>

            </div>


            <!-- STUDENT -->

            <div class="student-heading">

                ${avatar(student)}

                <div>

                    <h3>
                        ${esc(student.name)}
                    </h3>

                    <p>
                        @${esc(
                            student.leetcodeUsername
                        )}
                    </p>

                </div>

            </div>


            <!-- TOTAL -->

            <div class="total">

                ${pretty(stats.totalSolved)}

                <span>
                    Problems
                </span>

            </div>


            <!-- ACCEPTANCE -->

            <div class="accept">

                ${
                    stats.acceptanceRate == null
                        ? 'Acceptance unavailable'
                        : `${stats.acceptanceRate}% acceptance rate`
                }

            </div>


            <!-- LEVELS -->

            <div class="levels">

                <div>
                    <label>Easy</label>
                    <strong>
                        ${pretty(
                            stats.easySolved
                        )}
                    </strong>
                </div>

                <div>
                    <label>Medium</label>
                    <strong>
                        ${pretty(
                            stats.mediumSolved
                        )}
                    </strong>
                </div>

                <div>
                    <label>Hard</label>
                    <strong>
                        ${pretty(
                            stats.hardSolved
                        )}
                    </strong>
                </div>

            </div>


            <!-- PROGRESS -->

            <div class="progress">
                <i
                    style="width:${scale}%"
                ></i>
            </div>


            <!-- FOOTER -->

            <div class="card-foot">

                <span>
                    Updated ${date(
                        student.updatedAt
                    )}
                </span>

                <span class="view-detail">
                    View details →
                </span>

            </div>

        </article>
    `;
}

function filteredStudents(input = '') {

    let list =
        [...state.students];

    const q =
        input.trim().toLowerCase();

    if (q) {
        list =
            list.filter(
                s =>
                    s.name
                        .toLowerCase()
                        .includes(q) ||

                    s.leetcodeUsername
                        .toLowerCase()
                        .includes(q)
            );
    }

    if (state.filter === 'top') {
        list =
            list.filter(
                s => s.rank <= 3
            );
    }

    if (state.filter === 'solved') {
        list.sort(
            (a, b) =>
                b.statistics.totalSolved -
                a.statistics.totalSolved
        );
    }

    if (state.filter === 'acceptance') {
        list.sort(
            (a, b) =>
                (b.statistics.acceptanceRate || 0) -
                (a.statistics.acceptanceRate || 0)
        );
    }

    return list;
}

function renderCards(
    target,
    input = ''
) {

    const list =
        filteredStudents(input);

    $(target).innerHTML =
        list.length
            ? list
                .map(studentCard)
                .join('')
            : `
                <div class="empty">

                    <div class="empty-icon">
                        📈
                    </div>

                    <h3>
                        ${
                            state.students.length
                                ? 'No students found'
                                : 'Your classroom is empty'
                        }
                    </h3>

                    <p>
                        ${
                            state.students.length
                                ? 'Try a different search or filter.'
                                : 'Add your first LeetCode student to start tracking the class.'
                        }
                    </p>

                    ${
                        state.students.length
                            ? ''
                            : `
                                <button
                                    class="primary"
                                    data-open-modal
                                >
                                    Add Student
                                </button>
                            `
                    }

                </div>
            `;
}

function renderLeaderboard() {

    const query =
        $('#leaderSearch').value;

    const by =
        $('#leaderSort').value;

    const students =
        [...state.students]
            .filter(
                s =>
                    `${s.name} ${s.leetcodeUsername}`
                        .toLowerCase()
                        .includes(
                            query.toLowerCase()
                        )
            )
            .sort(
                (a, b) => {

                    const d =
                        (b.statistics[by] || 0) -
                        (a.statistics[by] || 0);

                    return d ||
                        a.rank -
                        b.rank;
                }
            );

    $('#leaderBody').innerHTML =
        students.length
            ? students
                .map(
                    s => {

                        const medal =
                            s.rank <= 3
                                ? `
                                    <span
                                        class="rank-medal ${
                                            s.rank === 2
                                                ? 'silver'
                                                : s.rank === 3
                                                    ? 'bronze'
                                                    : ''
                                        }"
                                    >
                                        ${
                                            s.rank === 1
                                                ? '♕'
                                                : s.rank
                                        }
                                    </span>
                                `
                                : `#${s.rank}`;

                        return `
                            <tr>

                                <td>
                                    ${medal}
                                </td>

                                <td class="table-person">

                                    ${avatar(s)}

                                    <div>

                                        ${esc(s.name)}

                                        <small>
                                            @${esc(
                                                s.leetcodeUsername
                                            )}
                                        </small>

                                    </div>

                                </td>

                                <td>
                                    ${pretty(
                                        s.statistics.totalSolved
                                    )}
                                </td>

                                <td>
                                    ${
                                        s.statistics.acceptanceRate == null
                                            ? '—'
                                            : s.statistics.acceptanceRate + '%'
                                    }
                                </td>

                                <td>
                                    ${pretty(
                                        s.statistics.easySolved
                                    )}
                                </td>

                                <td>
                                    ${pretty(
                                        s.statistics.mediumSolved
                                    )}
                                </td>

                                <td>
                                    ${pretty(
                                        s.statistics.hardSolved
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join('')
            : `
                <tr>
                    <td colspan="7">
                        No students found.
                    </td>
                </tr>
            `;
}

function renderDetail() {

    const s =
        state.students.find(
            x =>
                x.id === state.activeId
        );

    if (!s) {
        return navigate('classroom');
    }

    const x =
        s.statistics;

    const total =
        x.totalSolved || 1;

    const rows = [

        [
            'Total solved',
            pretty(x.totalSolved)
        ],

        [
            'Easy solved',
            pretty(x.easySolved)
        ],

        [
            'Medium solved',
            pretty(x.mediumSolved)
        ],

        [
            'Hard solved',
            pretty(x.hardSolved)
        ],

        [
            'Acceptance rate',
            x.acceptanceRate == null
                ? 'Unavailable'
                : x.acceptanceRate + '%'
        ],

        [
            'Total submissions',
            x.totalSubmissions
                ? pretty(x.totalSubmissions)
                : 'Unavailable'
        ],

        [
            'Global ranking',
            x.ranking
                ? pretty(x.ranking)
                : 'Unavailable'
        ],

        [
            'Contest rating',
            x.contestRating
                ? pretty(x.contestRating)
                : 'Unavailable'
        ]

    ];

    $('#detailContent').innerHTML = `

        <div class="detail-hero">

            <div class="detail-person">

                ${avatar(s)}

                <div>

                    <h1>
                        ${esc(s.name)}
                    </h1>

                    <p>
                        @${esc(
                            s.leetcodeUsername
                        )}

                        ·

                        <a
                            href="${esc(
                                s.leetcodeProfileUrl
                            )}"
                            target="_blank"
                            rel="noreferrer"
                        >
                            LeetCode profile ↗
                        </a>
                    </p>

                </div>

            </div>

            <button
                class="soft-btn"
                data-action="refresh"
                data-id="${esc(s.id)}"
            >
                Refresh statistics
            </button>

        </div>


        <div class="detail-grid">

            <div>

                <div class="detail-stats">

                    <article class="big-stat">
                        <span>Total Problems</span>
                        <strong>
                            ${pretty(
                                x.totalSolved
                            )}
                        </strong>
                    </article>

                    <article class="big-stat">
                        <span>Acceptance Rate</span>
                        <strong>
                            ${
                                x.acceptanceRate == null
                                    ? '—'
                                    : x.acceptanceRate + '%'
                            }
                        </strong>
                    </article>

                    <article class="big-stat">
                        <span>Class Ranking</span>
                        <strong>
                            #${s.rank}
                        </strong>
                    </article>

                    <article class="big-stat">
                        <span>Contest Rating</span>
                        <strong>
                            ${
                                x.contestRating
                                    ? pretty(
                                        x.contestRating
                                    )
                                    : '—'
                            }
                        </strong>
                    </article>

                </div>


                <article class="panel">

                    <h2>
                        Problem distribution
                    </h2>

                    ${
                        [
                            [
                                'Easy',
                                x.easySolved,
                                'easy'
                            ],
                            [
                                'Medium',
                                x.mediumSolved,
                                'medium'
                            ],
                            [
                                'Hard',
                                x.hardSolved,
                                'hard'
                            ]
                        ]
                        .map(
                            ([name, value, kind]) =>
                                `
                                    <div class="bar-row">

                                        <div class="bar-label">

                                            <span>
                                                ${name}
                                            </span>

                                            <strong>
                                                ${pretty(value)}
                                            </strong>

                                        </div>

                                        <div
                                            class="bar ${kind}"
                                        >
                                            <i
                                                style="width:${Math.round(
                                                    value /
                                                    total *
                                                    100
                                                )}%"
                                            ></i>
                                        </div>

                                    </div>
                                `
                        )
                        .join('')
                    }

                </article>

            </div>


            <aside class="panel">

                <h2>
                    Detailed statistics
                </h2>

                <table class="detail-table">

                    <tbody>

                        ${
                            rows
                                .map(
                                    r =>
                                        `
                                            <tr>
                                                <td>
                                                    ${r[0]}
                                                </td>

                                                <td>
                                                    ${r[1]}
                                                </td>
                                            </tr>
                                        `
                                )
                                .join('')
                        }

                    </tbody>

                </table>

                <p
                    style="
                        font-size:11px;
                        color:#89a397;
                        margin:16px 0 0
                    "
                >
                    Last refreshed
                    ${date(s.updatedAt)}
                </p>

            </aside>

        </div>
    `;
}

function render() {

    summary();

    renderCards(
        '#studentGrid',
        $('#studentSearch').value
    );

    renderCards(
        '#studentList',
        ''
    );

    renderLeaderboard();

    if (state.activeId) {
        renderDetail();
    }
}

function navigate(view) {

    $$('.view')
        .forEach(
            v =>
                v.classList.toggle(
                    'active',
                    v.id === view
                )
        );

    $$('nav a')
        .forEach(
            a =>
                a.classList.toggle(
                    'active',
                    a.dataset.view === view
                )
        );

    const pageLabel = $('#pageLabel');
    const separator = $('#crumbSeparator');

    if (view === 'classroom') {

        pageLabel.style.display = 'none';
        separator.style.display = 'none';

    } else {

        pageLabel.style.display = '';
        separator.style.display = '';

        pageLabel.textContent =
            view === 'detail'
                ? 'Student profile'
                : view[0].toUpperCase() +
                  view.slice(1);
    }

    window.location.hash = view;

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    $('.sidebar')
        ?.classList
        .remove('open');
}
async function load() {

    try {

        state.students =
            await api(
                '/api/students'
            );

        render();

    } catch (error) {

        toast(
            error.message,
            true
        );
    }
}

async function addStudent(event) {

    event.preventDefault();

    const button =
        $('#submitStudent');

    const error =
        $('#formError');

    error.textContent = '';

    button.disabled = true;

    button.textContent =
        'Adding…';

    try {

        await api(
            '/api/students',
            {
                method: 'POST',

                headers: {
                    'content-type':
                        'application/json'
                },

                body: JSON.stringify({
                    name:
                        $('#studentName').value,

                    profileUrl:
                        $('#profileUrl').value
                })
            }
        );

        $('#addForm').reset();

        closeModal();

        await load();

        toast(
            'Student added to your classroom ✓'
        );

    } catch (e) {

        error.textContent =
            e.message;

    } finally {

        button.disabled = false;

        button.textContent =
            'Add Student';
    }
}

async function refreshStudent(id) {

    try {

        toast(
            'Refreshing statistics…'
        );

        await api(
            `/api/students/${id}/refresh`,
            {
                method: 'POST'
            }
        );

        await load();

        toast(
            'Statistics updated successfully ✓'
        );

    } catch (e) {

        toast(
            e.message,
            true
        );
    }
}

async function removeStudent(id) {

    const s =
        state.students.find(
            x => x.id === id
        );

    if (
        !s ||
        !confirm(
            `Remove ${s.name} from the classroom?`
        )
    ) {
        return;
    }

    try {

        await api(
            `/api/students/${id}`,
            {
                method: 'DELETE'
            }
        );

        state.activeId = null;

        await load();

        navigate('classroom');

        toast(
            `${s.name} was removed.`
        );

    } catch (e) {

        toast(
            e.message,
            true
        );
    }
}

function closeModal() {

    $('#modal')
        .classList
        .remove('open');

    $('#formError')
        .textContent = '';
}

document.addEventListener(
    'click',
    event => {

        const open =
            event.target.closest(
                '[data-open-modal]'
            );

        if (open) {

            $('#modal')
                .classList
                .add('open');

            setTimeout(
                () =>
                    $('#studentName')
                        .focus(),
                100
            );

            return;
        }

        if (
            event.target.closest(
                '[data-close-modal]'
            ) ||
            event.target === $('#modal')
        ) {
            return closeModal();
        }

        if (
            event.target.matches(
                '.mobile-menu'
            )
        ) {
            return $('.sidebar')
                .classList
                .toggle('open');
        }

        const nav =
            event.target.closest(
                '[data-view]'
            );

        if (nav) {

            event.preventDefault();

            return navigate(
                nav.dataset.view
            );
        }

        const menu =
            event.target.closest(
                '[data-menu]'
            );

        if (menu) {

            event.stopPropagation();

            $$('.menu.show')
                .forEach(
                    m => {
                        if (
                            m.id !==
                            `menu-${menu.dataset.menu}`
                        ) {
                            m.classList.remove(
                                'show'
                            );
                        }
                    }
                );

            return $(
                `#menu-${menu.dataset.menu}`
            )
                .classList
                .toggle('show');
        }

        const action =
            event.target.closest(
                '[data-action]'
            );

        if (action) {

            event.stopPropagation();

            if (
                action.dataset.action ===
                'view'
            ) {
                state.activeId =
                    action.dataset.id;

                navigate('detail');

                renderDetail();
            }

            if (
                action.dataset.action ===
                'refresh'
            ) {
                refreshStudent(
                    action.dataset.id
                );
            }

            if (
                action.dataset.action ===
                'remove'
            ) {
                removeStudent(
                    action.dataset.id
                );
            }

            return;
        }

        const card =
            event.target.closest(
                '.student-card'
            );

        if (card) {

            state.activeId =
                card.dataset.id;

            navigate('detail');

            renderDetail();

        } else {

            $$('.menu.show')
                .forEach(
                    m =>
                        m.classList.remove(
                            'show'
                        )
                );
        }
    }
);

$('#addForm')
    .addEventListener(
        'submit',
        addStudent
    );

$('#studentSearch')
    .addEventListener(
        'input',
        () =>
            renderCards(
                '#studentGrid',
                $('#studentSearch').value
            )
    );

$('#leaderSearch')
    .addEventListener(
        'input',
        renderLeaderboard
    );

$('#leaderSort')
    .addEventListener(
        'change',
        renderLeaderboard
    );

$('#filters')
    .addEventListener(
        'click',
        e => {

            if (
                !e.target.dataset.filter
            ) {
                return;
            }

            state.filter =
                e.target.dataset.filter;

            $$('#filters button')
                .forEach(
                    b =>
                        b.classList.toggle(
                            'selected',
                            b === e.target
                        )
                );

            renderCards(
                '#studentGrid',
                $('#studentSearch').value
            );
        }
    );

$('#refreshAll')
    .addEventListener(
        'click',
        async () => {

            if (!state.students.length) {
                return toast(
                    'Add a student first.'
                );
            }

            try {

                toast(
                    'Refreshing classroom…'
                );

                const result =
                    await api(
                        '/api/refresh',
                        {
                            method: 'POST'
                        }
                    );

                state.students =
                    result.students;

                render();

                const failed =
                    result.results.filter(
                        x => !x.ok
                    ).length;

                toast(
                    failed
                        ? `Updated with ${failed} profile${
                            failed > 1
                                ? 's'
                                : ''
                        } unavailable.`
                        : 'Statistics updated successfully ✓',
                    !!failed
                );

            } catch (e) {

                toast(
                    e.message,
                    true
                );
            }
        }
    );

load();