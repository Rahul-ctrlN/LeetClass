(() => {

    const actions =
        document.querySelector(
            '.top-actions'
        );

    function escapeHtml(value) {

        return String(value ?? '')
            .replace(
                /[&<>"']/g,
                char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[char])
            );
    }

    function getTeacherInitials(name) {

        const parts =
            String(name || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (!parts.length) {
            return '?';
        }

        if (parts.length === 1) {
            return parts[0][0]
                .toUpperCase();
        }

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }

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

                ${badges.map(
                    badge => `

                        <article class="badge-card">

                            <div class="badge-image">

                                ${
                                    badge.image
                                        ? `
                                            <img
                                                src="${escapeHtml(
                                                    badge.image
                                                )}"
                                                alt="${escapeHtml(
                                                    badge.name
                                                )}"
                                                onerror="
                                                    this.hidden=true;
                                                    this.nextElementSibling.hidden=false
                                                "
                                            >
                                        `
                                        : ''
                                }

                                <span
                                    class="badge-fallback"
                                    ${
                                        badge.image
                                            ? 'hidden'
                                            : ''
                                    }
                                ></span>

                            </div>

                            <strong>
                                ${escapeHtml(
                                    badge.name
                                )}
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

                    `
                ).join('')}

            </div>
        `;
    }

    /* =========================
       CHECK TEACHER LOGIN
    ========================= */

    fetch('/api/auth/me')
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    'Authentication request failed.'
                );
            }

            return response.json();
        })
        .then(data => {

            if (!data.authenticated) {
                location.replace(
                    '/login.html'
                );
                return;
            }

            if (!actions) {
                return;
            }

            const user =
                data.user || {};

            const name =
                user.name ||
                'User';

            const email =
                user.email ||
                '';

            const initials =
                getTeacherInitials(
                    name
                );

            const account =
                document.createElement(
                    'div'
                );

            account.className =
                'account-menu';

            account.innerHTML = `

                <button
                    type="button"
                    class="account-toggle"
                    aria-expanded="false"
                >

                    <span class="avatar">

                        ${
                            user.picture
                                ? `
                                    <img
                                        src="${escapeHtml(
                                            user.picture
                                        )}"
                                        alt=""
                                    >
                                `
                                : `
                                    <span class="teacher-initials">
                                        ${escapeHtml(
                                            initials
                                        )}
                                    </span>
                                `
                        }

                    </span>

                    <span class="account-name">
                        ${escapeHtml(name)}
                    </span>

                </button>


                <div class="account-popover">

                    <strong>
                        ${escapeHtml(name)}
                    </strong>

                    <p>
                        ${escapeHtml(email)}
                    </p>

                    <button
                        type="button"
                        class="logout-account"
                    >
                        Log out
                    </button>

                </div>
            `;

            const toggle =
                account.querySelector(
                    '.account-toggle'
                );

            toggle.addEventListener(
                'click',
                event => {

                    event.stopPropagation();

                    account.classList.toggle(
                        'open'
                    );

                    toggle.setAttribute(
                        'aria-expanded',
                        String(
                            account.classList.contains(
                                'open'
                            )
                        )
                    );
                }
            );

            const logout =
                account.querySelector(
                    '.logout-account'
                );

            logout.addEventListener(
                'click',
                async () => {

                    try {

                        await fetch(
                            '/api/auth/logout',
                            {
                                method: 'POST'
                            }
                        );

                    } finally {

                        location.replace(
                            '/login.html'
                        );
                    }
                }
            );

            actions.appendChild(
                account
            );
        })
        .catch(() => {

            location.replace(
                '/login.html'
            );
        });


    /* =========================
       REMOVE ACTIVITY SECTION
       KEEP BADGES ONLY
    ========================= */

    const detail =
        document.querySelector(
            '#detailContent'
        );

    if (detail) {

        new MutationObserver(
            () => {

                if (
                    !detail.children.length ||
                    detail.querySelector(
                        '.achievements-panel'
                    )
                ) {
                    return;
                }

                const student =
                    window.__leetclassStudents
                        ? window.__leetclassStudents.find(
                            item =>
                                item.id ===
                                window.__leetclassActiveId
                        )
                        : null;

                /*
                 * If the main app doesn't expose
                 * its state, do not create a fake
                 * Activity section.
                 *
                 * Badges are handled by the
                 * student profile data when available.
                 */

            }
        ).observe(
            detail,
            {
                childList: true
            }
        );
    }

})();