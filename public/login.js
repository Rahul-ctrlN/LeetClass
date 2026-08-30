const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginNote = document.getElementById('loginNote');

const switchAuth = document.getElementById('switchAuth');
const switchText = document.getElementById('switchText');

const loginTitle = document.getElementById('loginTitle');
const loginCopy = document.getElementById('loginCopy');

let registerMode = false;

function showMessage(message, success = false) {
    loginNote.textContent = message;
    loginNote.style.color = success ? '#15803d' : '#dc2626';
}


/* Check existing login */

fetch('/api/auth/me')
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            window.location.replace('/');
        }
    })
    .catch(() => {});


/* Switch Login / Register */

if (switchAuth) {
    switchAuth.addEventListener('click', function () {

        registerMode = !registerMode;

        if (registerMode) {

            loginForm.style.display = 'none';
            registerForm.style.display = 'flex';

            loginTitle.innerHTML =
                'Create your<br>account.';

            loginCopy.textContent =
                'Create an account to start your coding classroom.';

            switchText.textContent =
                'Already have an account?';

            switchAuth.textContent =
                'Sign in';

        } else {

            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';

            loginTitle.innerHTML =
                'Track progress.<br>Grow together.';

            loginCopy.textContent =
                'Sign in to access your coding classroom.';

            switchText.textContent =
                "Don't have an account?";

            switchAuth.textContent =
                'Create account';
        }

        loginNote.textContent =
            'Your classroom is private to your account.';

        loginNote.style.color = '';
    });
}


/* Login */

if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {

        event.preventDefault();

        const email =
            document.getElementById('loginEmail').value.trim();

        const password =
            document.getElementById('loginPassword').value;

        if (!email || !password) {
            showMessage(
                'Please enter your email and password.'
            );
            return;
        }

        try {

            const response = await fetch(
                '/api/auth/login',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.error || 'Invalid email or password.'
                );
                return;
            }

            showMessage(
                'Login successful. Redirecting...',
                true
            );

            window.location.replace('/');

        } catch (error) {

            showMessage(
                'Unable to connect to the server.'
            );
        }
    });
}


/* Register */

if (registerForm) {
    registerForm.addEventListener('submit', async function (event) {

        event.preventDefault();

        const name =
            document.getElementById('registerName').value.trim();

        const email =
            document.getElementById('registerEmail').value.trim();

        const password =
            document.getElementById('registerPassword').value;

        const confirmPassword =
            document
                .getElementById('registerConfirmPassword')
                .value;

        if (!name || !email || !password || !confirmPassword) {
            showMessage(
                'Please fill in all fields.'
            );
            return;
        }

        if (password.length < 6) {
            showMessage(
                'Password must be at least 6 characters.'
            );
            return;
        }

        if (password !== confirmPassword) {
            showMessage(
                'Passwords do not match.'
            );
            return;
        }

        try {

            const response = await fetch(
                '/api/auth/register',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        confirmPassword
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.error ||
                    'Unable to create account.'
                );
                return;
            }

            showMessage(
                'Account created. Redirecting...',
                true
            );

            window.location.replace('/');

        } catch (error) {

            showMessage(
                'Unable to connect to the server.'
            );
        }
    });
}