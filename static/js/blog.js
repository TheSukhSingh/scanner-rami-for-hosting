document.addEventListener('DOMContentLoaded', () => {
    // Blog search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    const blogGrid = document.getElementById('blogGrid');
    const blogCards = blogGrid ? Array.from(blogGrid.querySelectorAll('.blog-card')) : [];
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    // Handle search
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
        
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }
    
    function performSearch(query) {
        if (!blogGrid) return;
        
        query = query.toLowerCase().trim();
        
        // If empty query, show all posts
        if (!query) {
            blogCards.forEach(card => {
                card.style.display = 'block';
            });
            return;
        }
        
        // Filter posts based on search query
        blogCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const content = card.querySelector('p').textContent.toLowerCase();
            const category = card.querySelector('.blog-category').textContent.toLowerCase();
            
            if (title.includes(query) || content.includes(query) || category.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Display message if no results
        if (blogGrid.querySelectorAll('.blog-card[style="display: block"]').length === 0) {
            showNoResults();
        } else {
            const noResults = blogGrid.querySelector('.no-results');
            if (noResults) noResults.remove();
        }
    }
    
    function showNoResults() {
        // Remove existing no results message if any
        const existingMessage = blogGrid.querySelector('.no-results');
        if (existingMessage) existingMessage.remove();
        
        // Create and add no results message
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <div class="no-results-content">
                <i class="fas fa-search fa-3x"></i>
                <h3>No posts found</h3>
                <p>Try different keywords or clear your search</p>
                <button class="btn secondary-btn" id="clearSearchBtn">Clear Search</button>
            </div>
        `;
        blogGrid.appendChild(noResults);
        
        // Add styles for no results
        const noResultsStyle = document.createElement('style');
        noResultsStyle.textContent = `
            .no-results {
                grid-column: 1 / -1;
                padding: 3rem;
                text-align: center;
            }
            
            .no-results-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            
            .no-results i {
                color: var(--text-muted);
                opacity: 0.6;
            }
            
            .no-results h3 {
                margin: 0;
            }
            
            .no-results p {
                color: var(--text-muted);
                margin-bottom: 1rem;
            }
        `;
        document.head.appendChild(noResultsStyle);
        
        // Add clear search button functionality
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            searchInput.value = '';
            categoryFilter.selectedIndex = 0;
            sortFilter.selectedIndex = 0;
            performSearch('');
            noResults.remove();
        });
    }
    
    // Filter by category
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            filterByCategory();
        });
    }
    
    function filterByCategory() {
        if (!blogGrid) return;
        
        const selectedCategory = categoryFilter.value.toLowerCase();
        
        // If no category selected, show all posts
        if (!selectedCategory) {
            blogCards.forEach(card => {
                card.style.display = 'block';
            });
        } else {
            // Filter posts based on selected category
            blogCards.forEach(card => {
                const category = card.querySelector('.blog-category').textContent.toLowerCase();
                
                if (category === selectedCategory) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Apply current search query after filtering
        if (searchInput && searchInput.value.trim()) {
            performSearch(searchInput.value);
        }
    }
    
    // Sort posts
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            sortPosts();
        });
    }
    
    function sortPosts() {
        if (!blogGrid) return;
        
        const sortOption = sortFilter.value;
        const sortedCards = [...blogCards];
        
        switch (sortOption) {
            case 'newest':
                sortedCards.sort((a, b) => {
                    const dateA = new Date(a.querySelector('.blog-date').textContent);
                    const dateB = new Date(b.querySelector('.blog-date').textContent);
                    return dateB - dateA;
                });
                break;
                
            case 'oldest':
                sortedCards.sort((a, b) => {
                    const dateA = new Date(a.querySelector('.blog-date').textContent);
                    const dateB = new Date(b.querySelector('.blog-date').textContent);
                    return dateA - dateB;
                });
                break;
                
            case 'popular':
                sortedCards.sort((a, b) => {
                    const viewsA = parseInt(a.querySelector('.fa-eye').nextSibling.textContent.trim());
                    const viewsB = parseInt(b.querySelector('.fa-eye').nextSibling.textContent.trim());
                    return viewsB - viewsA;
                });
                break;
        }
        
        // Re-append cards in new order
        sortedCards.forEach(card => {
            blogGrid.appendChild(card);
        });
    }
    
    // Pagination
    const paginationButtons = document.querySelectorAll('.pagination-btn');
    if (paginationButtons.length) {
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Prevent default if it's a link
                e.preventDefault();
                
                // Remove active class from all buttons
                paginationButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Scroll to top of blog grid
                if (blogGrid) {
                    window.scrollTo({
                        top: blogGrid.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
                
                // Add loading animation to simulate page change
                if (blogGrid) {
                    blogGrid.style.opacity = '0.5';
                    blogGrid.style.transition = 'opacity 0.3s ease';
                    
                    setTimeout(() => {
                        blogGrid.style.opacity = '1';
                    }, 500);
                }
                
                // In a real application, this would load new content
            });
        });
    }
});