(() => {

    const root = document.documentElement;

    const actions =
        document.querySelector('.top-actions');

    /*
     * =========================
     * ACCOUNT
     * =========================
     */

    fetch('/api/auth/me')
        .then(response => response.json())
        .then(data => {

            if (!data.authenticated) {
                location.replace('/login.html');
                return;
            }

            const account =
                document.createElement('div');

            account.className =
                'account-menu';

            const firstLetter =
                (data.user?.name || 'U')
                    .charAt(0)
                    .toUpperCase();

            account.innerHTML = `
                <button
                    class="account-toggle"
                    aria-expanded="false"
                >

                    <span class="avatar">

                        ${
                            data.user?.picture
                                ? `<img
                                    src="${data.user.picture}"
                                    alt=""
                                  >`
                                : firstLetter
                        }

                    </span>

                    <span>
                        ${data.user?.name || 'User'}
                    </span>

                </button>

                <div class="account-popover">

                    <strong>
                        ${data.user?.name || 'User'}
                    </strong>

                    <p>
                        ${data.user?.email || ''}
                    </p>

                    <button type="button">
                        Log out
                    </button>

                </div>
            `;

            account
                .querySelector('.account-toggle')
                .addEventListener(
                    'click',
                    () =>
                        account.classList.toggle('open')
                );

            account
                .querySelector('.account-popover button')
                .addEventListener(
                    'click',
                    async () => {

                        await fetch(
                            '/api/auth/logout',
                            {
                                method: 'POST'
                            }
                        );

                        location.replace(
                            '/login.html'
                        );
                    }
                );

            actions?.append(account);

        })
        .catch(
            () => location.replace('/login.html')
        );


    /*
     * =========================
     * BADGES
     * =========================
     */

    const detail =
        document.querySelector('#detailContent');


    const escapeHtml =
        value =>
            String(value ?? '')
                .replace(
                    /[&<>"']/g,
                    char =>
                        ({
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            "'": '&#39;'
                        })[char]
                );


    function badgeMarkup(badges) {

        if (!Array.isArray(badges)) {

            return `
                <p class="unavailable">
                    Badges unavailable for this profile.
                </p>
            `;
        }


        if (!badges.length) {

            return `
                <p class="unavailable">
                    No badges found.
                </p>
            `;
        }


        return `
            <div class="badge-grid">

                ${badges.map(badge => `

                    <article class="badge-card">

                        <div class="badge-image">

                            ${
                                badge.image
                                    ? `
                                        <img
                                            src="${escapeHtml(badge.image)}"
                                            alt="${escapeHtml(badge.name)}"
                                            loading="lazy"
                                            onerror="
                                                this.style.display='none';
                                                this.nextElementSibling.style.display='block';
                                            "
                                        >
                                      `
                                    : ''
                            }

                            <span
                                class="badge-fallback"
                                ${
                                    badge.image
                                        ? 'style="display:none;"'
                                        : ''
                                }
                            ></span>

                        </div>

                        <strong>
                            ${escapeHtml(badge.name)}
                        </strong>

                        ${
                            badge.earnedDate
                                ? `
                                    <small>
                                        ${escapeHtml(
                                            badge.earnedDate
                                        )}
                                    </small>
                                  `
                                : ''
                        }

                    </article>

                `).join('')}

            </div>
        `;
    }


    function addBadgePanel() {

        if (!detail) {
            return;
        }


        /*
         * Don't add the panel twice.
         */

        if (
            detail.querySelector(
                '.achievements-panel'
            )
        ) {
            return;
        }


        /*
         * app.js stores the selected student
         * in the global state object.
         */

        if (
            typeof state === 'undefined'
        ) {
            return;
        }


        const student =
            state.students.find(
                item =>
                    item.id === state.activeId
            );


        if (!student) {
            return;
        }


        const panel =
            document.createElement('section');


        panel.className =
            'panel achievements-panel';


        const badges =
            student.statistics?.badges || [];


        panel.innerHTML = `

            <h2>
                Achievements
            </h2>

            ${badgeMarkup(badges)}

        `;


        detail.appendChild(panel);
    }


    /*
     * Try immediately.
     *
     * This fixes the problem where app.js
     * renders before the observer starts.
     */

    addBadgePanel();


    /*
     * Also watch for future student-detail
     * changes.
     */

    if (detail) {

        new MutationObserver(() => {

            setTimeout(
                addBadgePanel,
                0
            );

        }).observe(
            detail,
            {
                childList: true,
                subtree: true
            }
        );

    }

})();