function showProfileModal() {
    Swal.fire({
        title: 'Edit Profile',
        html: `
            <div class="profile-preview">
                <img id="avatarPreview" class="profile-avatar-preview" src="${currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.username)}&background=2b2b2b&color=white&size=100`}">
                <button class="file-upload-label" onclick="window.showAvatarUploadDialog()">Change Avatar</button>
            </div>
            <input id="displayNameInput" class="profile-input" placeholder="Display Name" value="${escapeHtml(currentUser.displayName || currentUser.username)}">
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const displayName = document.getElementById('displayNameInput').value.trim();
            if (!displayName) {
                Swal.showValidationMessage('Display name is required');
                return false;
            }
            return { displayName };
        }
    }).then(async (result) => {
        if (result.value) {
            await usersRef.child(currentUser.id).update({
                displayName: result.value.displayName
            });
            currentUser.displayName = result.value.displayName;
            Swal.fire('Success', 'Profile updated', 'success');
            renderMainApp();
        }
    });
}

async function showAvatarUploadDialog() {
    const { value: choice } = await Swal.fire({
        title: 'Upload Avatar',
        input: 'select',
        inputOptions: {
            'url': 'Paste URL',
            'file': 'Upload File'
        },
        inputPlaceholder: 'Choose option',
        showCancelButton: true,
        confirmButtonText: 'Next',
        cancelButtonText: 'Cancel'
    });
    
    if (choice === 'url') {
        const { value: url } = await Swal.fire({
            title: 'Avatar URL',
            input: 'url',
            inputPlaceholder: 'https://example.com/avatar.jpg',
            showCancelButton: true,
            confirmButtonText: 'Save'
        });
        if (url) {
            await usersRef.child(currentUser.id).update({ avatar: url });
            currentUser.avatar = url;
            Swal.fire('Success', 'Avatar updated', 'success');
            renderMainApp();
        }
    } else if (choice === 'file') {
        const { value: file } = await Swal.fire({
            title: 'Select Image',
            input: 'file',
            inputAttributes: {
                'accept': 'image/*',
                'aria-label': 'Choose image'
            },
            showCancelButton: true,
            confirmButtonText: 'Upload'
        });
        if (file) {
            const avatarUrl = await uploadFile(file);
            await usersRef.child(currentUser.id).update({ avatar: avatarUrl });
            currentUser.avatar = avatarUrl;
            Swal.fire('Success', 'Avatar updated', 'success');
            renderMainApp();
        }
    }
}

async function showUserProfile(userId) {
    const userSnapshot = await usersRef.child(userId).once('value');
    const user = userSnapshot.val();
    if (!user) return;
    
    const displayName = user.displayName || user.username;
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=100`;
    
    let roleText = '';
    const roleSnapshot = await userRolesRef.child(userId).once('value');
    if (roleSnapshot.exists()) {
        const roleId = roleSnapshot.val();
        const roleData = await rolesRef.child(roleId).once('value');
        if (roleData.exists()) {
            roleText = `<div style="margin-top: 10px; padding: 5px 10px; background: ${roleData.val().color}; border-radius: 5px; display: inline-block;">Role: ${roleData.val().name}</div>`;
        }
    }
    
    Swal.fire({
        title: displayName,
        html: `
            <div style="text-align: center;">
                <img src="${avatarUrl}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 15px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=100'">
                <div><strong>Username:</strong> ${escapeHtml(user.username)}</div>
                ${roleText}
            </div>
        `,
        confirmButtonText: 'Close',
        background: '#0a0a0a',
        color: 'white'
    });
}

async function loadMembers() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    membersList.innerHTML = '<div class="loading-text">Loading...</div>';
    
    const snapshot = await usersRef.once('value');
    membersList.innerHTML = '';
    
    const users = [];
    snapshot.forEach(child => {
        users.push({
            id: child.key,
            username: child.val().username,
            displayName: child.val().displayName,
            avatar: child.val().avatar
        });
    });
    
    for (const user of users) {
        let roleHtml = '';
        const roleSnapshot = await userRolesRef.child(user.id).once('value');
        if (roleSnapshot.exists()) {
            const roleId = roleSnapshot.val();
            const roleData = await rolesRef.child(roleId).once('value');
            if (roleData.exists()) {
                roleHtml = `<span class="member-role" style="background: ${roleData.val().color};">${roleData.val().name}</span>`;
            }
        }
        
        const displayName = user.displayName || user.username;
        const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=32`;
        
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-item';
        memberDiv.onclick = () => showUserProfile(user.id);
        memberDiv.innerHTML = `
            <img class="member-avatar" src="${avatarUrl}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=32'">
            <div class="member-name">${escapeHtml(displayName)} ${user.username === ADMIN_USERNAME ? '👑' : ''}</div>
            ${roleHtml}
        `;
        membersList.appendChild(memberDiv);
    }
}
