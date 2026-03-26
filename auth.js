function renderAuthScreen() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `
        <div class="auth-overlay">
            <div class="auth-container">
                <div class="auth-title" id="authTitle">Register</div>
                <input type="text" id="username" class="auth-input" placeholder="Username">
                <input type="password" id="password" class="auth-input" placeholder="Password">
                <div id="errorMessage" class="error-message"></div>
                <button class="auth-button" id="submitButton">Register</button>
                <div class="auth-switch" id="authSwitch">Already have an account? Login</div>
            </div>
        </div>
    `;
    
    let isLoginMode = false;
    
    document.getElementById('submitButton').onclick = () => submitAuth(isLoginMode);
    document.getElementById('authSwitch').onclick = () => {
        isLoginMode = !isLoginMode;
        const title = document.getElementById('authTitle');
        const submitBtn = document.getElementById('submitButton');
        const switchBtn = document.getElementById('authSwitch');
        
        if (isLoginMode) {
            title.textContent = 'Login';
            submitBtn.textContent = 'Login';
            switchBtn.textContent = "Don't have an account? Register";
        } else {
            title.textContent = 'Register';
            submitBtn.textContent = 'Register';
            switchBtn.textContent = 'Already have an account? Login';
        }
        document.getElementById('errorMessage').textContent = '';
    };
}

async function submitAuth(isLoginMode) {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('errorMessage');
    const submitButton = document.getElementById('submitButton');
    
    if (!username || !password) {
        errorElement.textContent = 'Fill in all fields';
        return;
    }
    
    if (username.length < 3) {
        errorElement.textContent = 'Username must be at least 3 characters';
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = 'Checking...';
    errorElement.textContent = '';
    
    try {
        if (isLoginMode) {
            const userSnapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
            
            if (!userSnapshot.exists()) {
                errorElement.textContent = 'User not found';
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
                return;
            }
            
            let userFound = false;
            userSnapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.password === password) {
                    userFound = true;
                    currentUser = {
                        id: childSnapshot.key,
                        username: data.username,
                        displayName: data.displayName,
                        avatar: data.avatar
                    };
                }
            });
            
            if (userFound) {
                const isBanned = await bansRef.child(currentUser.id).once('value');
                if (isBanned.exists()) {
                    const banData = isBanned.val();
                    if (!banData.expiresAt || banData.expiresAt > Date.now()) {
                        errorElement.textContent = 'You are banned from this server';
                        submitButton.disabled = false;
                        submitButton.textContent = 'Login';
                        return;
                    } else {
                        await bansRef.child(currentUser.id).remove();
                    }
                }
                
                localStorage.setItem('chatUser', JSON.stringify(currentUser));
                isAdmin = currentUser.username === ADMIN_USERNAME;
                
                renderMainApp();
            } else {
                errorElement.textContent = 'Invalid password';
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        } else {
            const existingUser = await usersRef.orderByChild('username').equalTo(username).once('value');
            
            if (existingUser.exists()) {
                errorElement.textContent = 'Username already taken';
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
                return;
            }
            
            const newUserRef = usersRef.push();
            await newUserRef.set({
                username: username,
                password: password,
                displayName: username,
                avatar: null,
                createdAt: Date.now()
            });
            
            currentUser = {
                id: newUserRef.key,
                username: username,
                displayName: username,
                avatar: null
            };
            localStorage.setItem('chatUser', JSON.stringify(currentUser));
            isAdmin = currentUser.username === ADMIN_USERNAME;
            
            renderMainApp();
        }
    } catch (error) {
        errorElement.textContent = 'Error: ' + (error.message || 'Unknown error');
        submitButton.disabled = false;
        submitButton.textContent = isLoginMode ? 'Login' : 'Register';
    }
}

function logout() {
    if (currentMessagesListener && currentChannelId) {
        messagesRef.child(currentChannelId).off('child_added', currentMessagesListener);
    }
    currentUser = null;
    currentChannelId = null;
    localStorage.removeItem('chatUser');
    renderAuthScreen();
}
