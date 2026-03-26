async function showImageUploadDialog() {
    const { value: choice } = await Swal.fire({
        title: 'Upload Image',
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
            title: 'Image URL',
            input: 'url',
            inputPlaceholder: 'https://example.com/image.jpg',
            showCancelButton: true,
            confirmButtonText: 'Send'
        });
        if (url) {
            sendMessage(url, 'image');
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
            const imageUrl = await uploadFile(file);
            sendMessage(imageUrl, 'image');
        }
    }
}

async function showGifUploadDialog() {
    const { value: choice } = await Swal.fire({
        title: 'Upload GIF',
        input: 'select',
        inputOptions: {
            'url': 'Paste GIF URL',
            'file': 'Upload GIF File'
        },
        inputPlaceholder: 'Choose option',
        showCancelButton: true,
        confirmButtonText: 'Next',
        cancelButtonText: 'Cancel'
    });
    
    if (choice === 'url') {
        const { value: url } = await Swal.fire({
            title: 'GIF URL',
            input: 'url',
            inputPlaceholder: 'https://example.com/animation.gif or Tenor link',
            showCancelButton: true,
            confirmButtonText: 'Send'
        });
        if (url) {
            const directUrl = getDirectGifUrl(url);
            sendMessage(directUrl, 'gif');
        }
    } else if (choice === 'file') {
        const { value: file } = await Swal.fire({
            title: 'Select GIF',
            input: 'file',
            inputAttributes: {
                'accept': 'image/gif',
                'aria-label': 'Choose GIF'
            },
            showCancelButton: true,
            confirmButtonText: 'Upload'
        });
        if (file) {
            const gifUrl = await uploadFile(file);
            sendMessage(gifUrl, 'gif');
        }
    }
}
