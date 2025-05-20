document.addEventListener('DOMContentLoaded', () => {
    // Like button functionality
    const likeButton = document.getElementById('likeButton');
    const likeCount = document.getElementById('likeCount');
    
    if (likeButton && likeCount) {
        likeButton.addEventListener('click', () => {
            // Toggle like state
            if (likeButton.classList.contains('active')) {
                likeButton.classList.remove('active');
                likeButton.querySelector('i').classList.replace('fas', 'far');
                likeCount.textContent = parseInt(likeCount.textContent) - 1;
            } else {
                likeButton.classList.add('active');
                likeButton.querySelector('i').classList.replace('far', 'fas');
                likeCount.textContent = parseInt(likeCount.textContent) + 1;
                
                // Add a small animation effect
                likeCount.animate([
                    { transform: 'scale(1.5)', color: 'var(--primary)' },
                    { transform: 'scale(1)', color: 'inherit' }
                ], {
                    duration: 300,
                    easing: 'ease-out'
                });
            }
        });
    }
    
    // Share button functionality
    const shareButton = document.querySelector('.share-button');
    const shareOptions = document.getElementById('shareOptions');
    
    if (shareButton && shareOptions) {
        shareButton.addEventListener('click', () => {
            // Toggle share options display
            shareOptions.style.display = shareOptions.style.display === 'flex' ? 'none' : 'flex';
            
            // Add animation
            if (shareOptions.style.display === 'flex') {
                shareOptions.animate([
                    { opacity: 0, transform: 'translateY(-10px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], {
                    duration: 300,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
            }
            
            // Close share options when clicking outside
            document.addEventListener('click', function closeShareOptions(e) {
                if (!shareButton.contains(e.target) && !shareOptions.contains(e.target)) {
                    shareOptions.style.display = 'none';
                    document.removeEventListener('click', closeShareOptions);
                }
            });
        });
        
        // Share option click handlers
        const shareOptionButtons = shareOptions.querySelectorAll('.share-option');
        shareOptionButtons.forEach(option => {
            option.addEventListener('click', () => {
                // Get current URL
                const url = window.location.href;
                const title = document.querySelector('.blog-post-header h1').textContent;
                
                // Handle different share options
                if (option.classList.contains('copy-link')) {
                    // Copy to clipboard
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Link copied to clipboard!');
                    }).catch(err => {
                        showToast('Could not copy link: ' + err, 'error');
                    });
                } else if (option.querySelector('.fa-twitter')) {
                    // Twitter share
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
                } else if (option.querySelector('.fa-facebook')) {
                    // Facebook share
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                } else if (option.querySelector('.fa-linkedin')) {
                    // LinkedIn share
                    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
                }
                
                // Hide share options after click
                shareOptions.style.display = 'none';
            });
        });
    }
    
    // Comment form submission
    const commentForm = document.getElementById('commentForm');
    
    if (commentForm) {
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('commentName').value;
            const email = document.getElementById('commentEmail').value;
            const content = document.getElementById('commentContent').value;
            
            // Validate
            if (!name || !email || !content) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            // Create new comment (for demo purposes)
            const newComment = createCommentElement(name, content);
            
            // Add comment to list
            const commentsList = document.querySelector('.comments-list');
            commentsList.insertBefore(newComment, commentsList.firstChild);
            
            // Update comment count
            const commentCount = document.querySelector('.comment-count');
            const count = parseInt(commentCount.textContent.replace(/[()]/g, '')) + 1;
            commentCount.textContent = `(${count})`;
            
            // Clear form
            commentForm.reset();
            
            // Show success message
            showToast('Comment posted successfully!');
            
            // Animate new comment
            newComment.animate([
                { opacity: 0, transform: 'translateY(-20px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], {
                duration: 500,
                easing: 'ease-out',
                fill: 'forwards'
            });
        });
    }
    
    // Reply button functionality
    const replyButtons = document.querySelectorAll('.reply-btn');
    
    replyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const commentBody = button.closest('.comment-body');
            const replyForm = commentBody.querySelector('.reply-form');
            
            if (replyForm) {
                // If form already exists, toggle it
                replyForm.classList.toggle('active');
            } else {
                // Create new reply form
                const newReplyForm = document.createElement('div');
                newReplyForm.className = 'reply-form';
                newReplyForm.innerHTML = `
                    <form>
                        <textarea placeholder="Write your reply..." rows="3" required></textarea>
                        <div class="form-buttons">
                            <button type="submit" class="btn comment-btn">Reply</button>
                            <button type="button" class="btn secondary-btn cancel-reply">Cancel</button>
                        </div>
                    </form>
                `;
                
                // Insert after comment actions
                const commentActions = button.closest('.comment-actions');
                commentActions.insertAdjacentElement('afterend', newReplyForm);
                
                // Animate form
                newReplyForm.animate([
                    { opacity: 0, transform: 'translateY(-10px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], {
                    duration: 300,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                
                // Focus textarea
                setTimeout(() => {
                    newReplyForm.querySelector('textarea').focus();
                }, 100);
                
                // Handle submit
                newReplyForm.querySelector('form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const replyContent = newReplyForm.querySelector('textarea').value;
                    if (!replyContent) return;
                    
                    // Create new reply
                    const comment = button.closest('.comment');
                    let replies = comment.querySelector('.replies');
                    
                    if (!replies) {
                        replies = document.createElement('div');
                        replies.className = 'replies';
                        comment.appendChild(replies);
                    }
                    
                    // Add reply to list
                    const newReply = createCommentElement('You', replyContent, true);
                    replies.appendChild(newReply);
                    
                    // Remove form
                    newReplyForm.remove();
                    
                    // Show success message
                    showToast('Reply posted successfully!');
                    
                    // Animate new reply
                    newReply.animate([
                        { opacity: 0, transform: 'translateY(-10px)' },
                        { opacity: 1, transform: 'translateY(0)' }
                    ], {
                        duration: 500,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
                
                // Handle cancel
                newReplyForm.querySelector('.cancel-reply').addEventListener('click', () => {
                    newReplyForm.animate([
                        { opacity: 1, transform: 'translateY(0)' },
                        { opacity: 0, transform: 'translateY(-10px)' }
                    ], {
                        duration: 300,
                        easing: 'ease-in',
                        fill: 'forwards'
                    }).onfinish = () => newReplyForm.remove();
                });
            }
        });
    });
    
    // Comment like button functionality
    const commentLikeButtons = document.querySelectorAll('.like-btn');
    
    commentLikeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const icon = button.querySelector('i');
            const count = button.querySelector('span');
            
            if (button.classList.contains('active')) {
                button.classList.remove('active');
                icon.classList.replace('fas', 'far');
                count.textContent = parseInt(count.textContent) - 1;
            } else {
                button.classList.add('active');
                icon.classList.replace('far', 'fas');
                count.textContent = parseInt(count.textContent) + 1;
                
                // Add animation
                count.animate([
                    { transform: 'scale(1.5)', color: 'var(--primary)' },
                    { transform: 'scale(1)', color: 'inherit' }
                ], {
                    duration: 300,
                    easing: 'ease-out'
                });
            }
        });
    });
    
    // Load more comments button
    const loadMoreBtn = document.querySelector('.load-more-btn');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.disabled = true;
            
            // Simulate loading delay
            setTimeout(() => {
                // In a real app, this would fetch more comments from server
                // For demo purposes, we'll just show a message
                loadMoreBtn.textContent = 'No more comments';
                loadMoreBtn.classList.add('disabled');
            }, 1500);
        });
    }
    
    // Highlight code blocks (simple syntax highlighting for demo)
    const codeBlocks = document.querySelectorAll('.code-block code');
    
    codeBlocks.forEach(block => {
        // Highlight keywords
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'return', 'import', 'export', 'class', 'def', 'for', 'while'];
        let content = block.innerHTML;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            content = content.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        // Highlight strings
        content = content.replace(/(["'`])(.*?)\1/g, '<span class="string">$&</span>');
        
        // Highlight comments
        content = content.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
        content = content.replace(/(#.*)/g, '<span class="comment">$1</span>');
        
        block.innerHTML = content;
        
        // Add CSS for syntax highlighting
        if (!document.getElementById('code-highlight-style')) {
            const style = document.createElement('style');
            style.id = 'code-highlight-style';
            style.textContent = `
                .keyword {
                    color: #ff79c6;
                }
                
                .string {
                    color: #f1fa8c;
                }
                
                .comment {
                    color: #6272a4;
                }
            `;
            document.head.appendChild(style);
        }
    });
});

// Helper function to create a comment element
function createCommentElement(name, content, isReply = false) {
    const now = new Date();
    const dateString = `${now.toLocaleString('default', { month: 'short' })} ${now.getDate()}, ${now.getFullYear()}`;
    
    const comment = document.createElement('div');
    comment.className = `comment${isReply ? ' reply' : ''}`;
    
    const avatarSrc = `https://i.pravatar.cc/40?img=${Math.floor(Math.random() * 70)}`;
    
    comment.innerHTML = `
        <div class="comment-avatar">
            <img src="${avatarSrc}" alt="${name}">
        </div>
        <div class="comment-body">
            <div class="comment-header">
                <h4>${name}</h4>
                <span class="comment-date">${dateString}</span>
            </div>
            <p>${content}</p>
            <div class="comment-actions">
                <button class="reply-btn">Reply</button>
                <button class="like-btn"><i class="far fa-thumbs-up"></i> <span>0</span></button>
            </div>
        </div>
    `;
    
    // Add event listeners to new buttons
    const replyBtn = comment.querySelector('.reply-btn');
    const likeBtn = comment.querySelector('.like-btn');
    
    replyBtn.addEventListener('click', function() {
        // Clone the existing reply form functionality
        const commentBody = this.closest('.comment-body');
        const replyForm = commentBody.querySelector('.reply-form');
        
        if (replyForm) {
            replyForm.classList.toggle('active');
        } else {
            const newReplyForm = document.createElement('div');
            newReplyForm.className = 'reply-form';
            newReplyForm.innerHTML = `
                <form>
                    <textarea placeholder="Write your reply..." rows="3" required></textarea>
                    <div class="form-buttons">
                        <button type="submit" class="btn comment-btn">Reply</button>
                        <button type="button" class="btn secondary-btn cancel-reply">Cancel</button>
                    </div>
                </form>
            `;
            
            const commentActions = this.closest('.comment-actions');
            commentActions.insertAdjacentElement('afterend', newReplyForm);
            
            newReplyForm.querySelector('textarea').focus();
            
            // Add form submit event
            newReplyForm.querySelector('form').addEventListener('submit', (e) => {
                e.preventDefault();
                replyForm.classList.remove('active');
                showToast('Reply posted successfully!');
                newReplyForm.remove();
            });
            
            // Add cancel event
            newReplyForm.querySelector('.cancel-reply').addEventListener('click', () => {
                newReplyForm.remove();
            });
        }
    });
    
    likeBtn.addEventListener('click', function() {
        const icon = this.querySelector('i');
        const count = this.querySelector('span');
        
        if (this.classList.contains('active')) {
            this.classList.remove('active');
            icon.classList.replace('fas', 'far');
            count.textContent = parseInt(count.textContent) - 1;
        } else {
            this.classList.add('active');
            icon.classList.replace('far', 'fas');
            count.textContent = parseInt(count.textContent) + 1;
        }
    });
    
    return comment;
}

// Toast notification function
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
            }
            
            .toast {
                padding: 12px 20px;
                margin-bottom: 10px;
                border-radius: var(--radius-md);
                background-color: var(--glass-effect);
                backdrop-filter: blur(8px);
                border: 1px solid var(--border);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                transform: translateY(100%);
                opacity: 0;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 250px;
                text-align: center;
                justify-content: center;
            }
            
            .toast.show {
                transform: translateY(0);
                opacity: 1;
            }
            
            .toast.success i {
                color: #2ed573;
            }
            
            .toast.error i {
                color: #ff4757;
            }
            
            .toast.warning i {
                color: #ffa502;
            }
            
            .toast.info i {
                color: var(--primary);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Get icon for toast type
    let icon;
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            break;
        case 'info':
            icon = 'fa-info-circle';
            break;
        default:
            icon = 'fa-check-circle';
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to container
    const container = document.querySelector('.toast-container');
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}