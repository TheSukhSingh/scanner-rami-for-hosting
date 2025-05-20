document.addEventListener('DOMContentLoaded', () => {
    // Handle image upload preview
    const imageInput = document.getElementById('postImage');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            
            if (file) {
                // Validate file type
                const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
                if (!validTypes.includes(file.type)) {
                    showNotification('Please select a valid image file (JPG, PNG, GIF, SVG).', 'error');
                    return;
                }
                
                // Validate file size (2MB max)
                if (file.size > 2 * 1024 * 1024) {
                    showNotification('Image file size must be less than 2MB.', 'error');
                    return;
                }
                
                // Create preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                    imagePreview.classList.add('active');
                    uploadPlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Character counter for summary
    const summaryTextarea = document.getElementById('postSummary');
    const summaryCharCount = document.getElementById('summaryCharCount');
    
    if (summaryTextarea && summaryCharCount) {
        summaryTextarea.addEventListener('input', () => {
            const count = summaryTextarea.value.length;
            summaryCharCount.textContent = count;
            
            // Change color if exceeding limit
            if (count > 160) {
                summaryCharCount.style.color = '#ff4757';
            } else {
                summaryCharCount.style.color = 'inherit';
            }
        });
    }
    
    // Simple text editor toolbar functionality
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    const contentTextarea = document.getElementById('postContent');
    
    if (toolbarButtons.length && contentTextarea) {
        toolbarButtons.forEach(button => {
            button.addEventListener('click', () => {
                const style = button.dataset.style;
                
                // Get selection
                const start = contentTextarea.selectionStart;
                const end = contentTextarea.selectionEnd;
                const selection = contentTextarea.value.substring(start, end);
                const beforeSelection = contentTextarea.value.substring(0, start);
                const afterSelection = contentTextarea.value.substring(end);
                
                let replacement = '';
                
                // Apply style based on button type
                switch (style) {
                    case 'bold':
                        replacement = `**${selection || 'bold text'}**`;
                        break;
                        
                    case 'italic':
                        replacement = `*${selection || 'italic text'}*`;
                        break;
                        
                    case 'underline':
                        replacement = `<u>${selection || 'underlined text'}</u>`;
                        break;
                        
                    case 'h2':
                        replacement = `\n## ${selection || 'Heading 2'}\n`;
                        break;
                        
                    case 'h3':
                        replacement = `\n### ${selection || 'Heading 3'}\n`;
                        break;
                        
                    case 'link':
                        replacement = `[${selection || 'link text'}](url)`;
                        break;
                        
                    case 'quote':
                        replacement = `\n> ${selection || 'Quotation or excerpt'}\n`;
                        break;
                        
                    case 'code':
                        replacement = `\`\`\`\n${selection || 'code here'}\n\`\`\``;
                        break;
                        
                    case 'list-ul':
                        if (selection) {
                            // If there's a selection, convert each line to list item
                            replacement = selection
                                .split('\n')
                                .map(line => line.trim() ? `- ${line}` : line)
                                .join('\n');
                        } else {
                            replacement = '- List item';
                        }
                        break;
                        
                    case 'list-ol':
                        if (selection) {
                            // If there's a selection, convert each line to numbered list item
                            const lines = selection.split('\n');
                            replacement = lines
                                .map((line, index) => line.trim() ? `${index + 1}. ${line}` : line)
                                .join('\n');
                        } else {
                            replacement = '1. List item';
                        }
                        break;
                }
                
                // Update textarea content
                contentTextarea.value = beforeSelection + replacement + afterSelection;
                
                // Focus back on textarea and set cursor position after inserted content
                contentTextarea.focus();
                contentTextarea.setSelectionRange(
                    beforeSelection.length + replacement.length,
                    beforeSelection.length + replacement.length
                );
                
                // Toggle active state for button
                button.classList.toggle('active');
                setTimeout(() => {
                    button.classList.remove('active');
                }, 300);
            });
        });
    }
    
    // Tag input handling
    const tagInput = document.getElementById('postTags');
    
    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                
                const value = tagInput.value.trim();
                if (value) {
                    // In a real app, this would create tag elements
                    // For demo, just format the input
                    const tags = tagInput.value.split(',').filter(tag => tag.trim());
                    tagInput.value = tags.join(', ');
                }
            }
        });
    }
    
    // Form submission
    const blogForm = document.getElementById('blogForm');
    
    if (blogForm) {
        blogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const title = document.getElementById('postTitle').value;
            const category = document.getElementById('postCategory').value;
            const summary = document.getElementById('postSummary').value;
            const content = document.getElementById('postContent').value;
            const tags = document.getElementById('postTags').value;
            const image = document.getElementById('postImage').files[0];
            
            // Basic validation
            if (!title || !category || !summary || !content) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }
            
            if (summary.length > 160) {
                showNotification('Summary should be less than 160 characters.', 'error');
                return;
            }
            
            // Simulate form submission
            showNotification('Submitting post...', 'info');
            
            // In a real app, this would be an AJAX request to submit the form
            setTimeout(() => {
                showNotification('Post published successfully!', 'success');
                

            }, 2000);
        });
        
        // Save draft functionality
        const saveButton = document.querySelector('.secondary-btn');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                // Check if form has any content
                const title = document.getElementById('postTitle').value;
                const content = document.getElementById('postContent').value;
                
                if (!title && !content) {
                    showNotification('Nothing to save. Add title or content first.', 'warning');
                    return;
                }
                
                showNotification('Saving draft...', 'info');
                
                // In a real app, this would save data to localStorage or server
                setTimeout(() => {
                    showNotification('Draft saved successfully!', 'success');
                }, 1000);
            });
        }
    }
});

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element if not exists
    if (!document.querySelector('.notification-container')) {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
            }
            
            .notification {
                padding: 12px 20px;
                margin-bottom: 10px;
                border-radius: var(--radius-md);
                color: white;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 350px;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.info {
                background-color: var(--primary);
            }
            
            .notification.success {
                background-color: #2ed573;
            }
            
            .notification.warning {
                background-color: #ffa502;
            }
            
            .notification.error {
                background-color: #ff4757;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${getIconForType(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add to container
    const container = document.querySelector('.notification-container');
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getIconForType(type) {
    switch (type) {
        case 'info': return 'fa-info-circle';
        case 'success': return 'fa-check-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-exclamation-circle';
        default: return 'fa-info-circle';
    }
}