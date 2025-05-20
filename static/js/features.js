document.addEventListener('DOMContentLoaded', () => {
    // Initialize feature tabs functionality
    const featureNavButtons = document.querySelectorAll('.feature-nav-btn');
    const featureInfoSections = document.querySelectorAll('.feature-info');
    const featureVisuals = document.querySelectorAll('.feature-visual-content');
    
    // Set default active tab
    let activeFeature = 'ip-scan';
    
    featureNavButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get target feature
            const target = button.dataset.target;
            
            // Skip if already active
            if (target === activeFeature) return;
            
            // Update active feature
            activeFeature = target;
            
            // Remove active class from all buttons
            featureNavButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all feature info sections first
            featureInfoSections.forEach(section => {
                if (section.classList.contains('active')) {
                    // Fade out animation
                    section.style.opacity = '0';
                    section.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        section.classList.remove('active');
                        section.style.display = 'none';
                    }, 300);
                }
            });
            
            // Hide all visuals
            featureVisuals.forEach(visual => {
                if (visual.classList.contains('active')) {
                    visual.style.opacity = '0';
                    
                    setTimeout(() => {
                        visual.classList.remove('active');
                        visual.style.display = 'none';
                    }, 300);
                }
            });
            
            // Show target info section with animation
            setTimeout(() => {
                const targetInfoSection = document.querySelector(`.feature-info[data-feature="${target}"]`);
                const targetVisual = document.querySelector(`.feature-visual-content[data-feature="${target}"]`);
                
                if (targetInfoSection) {
                    targetInfoSection.style.display = 'block';
                    
                    // Force reflow to enable animation
                    targetInfoSection.offsetHeight;
                    
                    targetInfoSection.classList.add('active');
                    targetInfoSection.style.opacity = '1';
                    targetInfoSection.style.transform = 'translateY(0)';
                }
                
                if (targetVisual) {
                    targetVisual.style.display = 'flex';
                    
                    // Force reflow to enable animation
                    targetVisual.offsetHeight;
                    
                    targetVisual.classList.add('active');
                    targetVisual.style.opacity = '1';
                }
            }, 300);
        });
    });
    
    // Add code snippet highlighting (simple syntax highlighting for demo)
    const codeSnippets = document.querySelectorAll('.code-snippet code');
    
    codeSnippets.forEach(snippet => {
        // Highlight keywords
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'return', 'then', 'class', 'import', 'export', 'new', 'console', 'alert', 'const', 'function', 'const', 'let', 'var'];
        let content = snippet.innerHTML;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            content = content.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        // Highlight strings
        content = content.replace(/(["'`])(.*?)\1/g, '<span class="string">$&</span>');
        
        // Highlight comments
        content = content.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
        
        // Method calls
        content = content.replace(/(\w+)(\s*\()/g, '<span class="method">$1</span>$2');
        
        snippet.innerHTML = content;
        
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
                
                .method {
                    color: #50fa7b;
                }
            `;
            document.head.appendChild(style);
        }
    });
    
    // Add animation to spec cards on scroll
    const specCards = document.querySelectorAll('.spec-card');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        specCards.forEach((card, index) => {
            // Set initial styles
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.transitionDelay = `${index * 0.1}s`;
            
            observer.observe(card);
        });
    }
    
    // Add smooth scrolling for CTA buttons
    document.querySelectorAll('.feature-btn, .cta-buttons .btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Scroll to register page or show login modal
            const href = button.getAttribute('href');
            if (href) {
                window.location.href = href;
            } else {
                // Show demo functionality message
                showToast('Demo feature initiated!');
            }
        });
    });
});

// Toast notification function
function showToast(message) {
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
                color: var(--text);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                transform: translateY(100%);
                opacity: 0;
                transition: all 0.3s ease;
                text-align: center;
            }
            
            .toast.show {
                transform: translateY(0);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
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
