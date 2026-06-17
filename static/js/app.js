document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let bookData = null;
    let activeTab = 'issues-content';
    let currentFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshSpinner = document.getElementById('refresh-spinner');
    const btnIcon = btnRefresh.querySelector('.btn-icon');
    const btnText = btnRefresh.querySelector('.btn-text');
    const dataSourceDisp = document.getElementById('data-source');
    
    // Panels & Content
    const bookSkeleton = document.getElementById('book-skeleton');
    const bookContent = document.getElementById('book-content');
    const issuesGrid = document.getElementById('issues-grid-container');
    const alertsFeed = document.getElementById('alerts-feed-container');
    
    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const badgeIssuesCount = document.getElementById('badge-issues-count');
    const badgeUpdatesCount = document.getElementById('badge-updates-count');

    // Search and Filters
    const issuesSearch = document.getElementById('issues-search');
    const filterContainer = document.getElementById('category-filters-container');

    // Modal elements
    const emailModal = document.getElementById('email-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnModalOk = document.getElementById('btn-modal-ok');
    const emailSuccessBanner = document.getElementById('email-success-banner');
    const emailSimAlert = document.getElementById('email-sim-alert');
    const emailPreviewTo = document.getElementById('email-preview-to');
    const emailPreviewSubject = document.getElementById('email-preview-subject');
    const emailPreviewBody = document.getElementById('email-preview-body');
    const clientSmtpRow = document.getElementById('client-smtp-row');
    const emailPreviewSmtp = document.getElementById('email-preview-smtp');
    const emailStatusHeading = document.getElementById('email-status-heading');
    const emailStatusMessage = document.getElementById('email-status-message');

    // Initialize application
    fetchBookDetails();

    // Event Listeners
    btnRefresh.addEventListener('click', () => {
        fetchBookDetails(true);
    });

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetPaneId = tab.getAttribute('data-tab');
            
            // Update active states
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            document.getElementById(targetPaneId).classList.add('active');
            
            activeTab = targetPaneId;
        });
    });

    // Search Filter input
    issuesSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderIssues();
    });

    // Category Filter Tags
    filterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderIssues();
        }
    });

    // Close Modal Event listeners
    [btnCloseModal, btnModalOk].forEach(btn => {
        btn.addEventListener('click', () => {
            emailModal.style.display = 'none';
        });
    });

    // Close Modal on clicking overlay
    emailModal.addEventListener('click', (e) => {
        if (e.target === emailModal) {
            emailModal.style.display = 'none';
        }
    });

    /* ==========================================================================
       Core Functions
       ========================================================================== */

    /**
     * Fetches book details from the Flask API.
     * @param {boolean} isRefresh Whether this is a user-triggered refresh
     */
    async function fetchBookDetails(isRefresh = false) {
        setLoadingState(true);
        if (isRefresh) {
            showToast('Fetching latest book updates from Amazon Store...', 'info');
        }

        try {
            // Append cache busting parameter for refresh operations
            const response = await fetch(`/api/book-details${isRefresh ? '?t=' + Date.now() : ''}`);
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            bookData = await response.json();
            populateBookDetails(bookData);
            renderIssues();
            renderUpdates();
            
            // Update badges
            badgeIssuesCount.textContent = bookData.magazine_issues ? bookData.magazine_issues.length : 0;
            badgeUpdatesCount.textContent = bookData.updates ? bookData.updates.length : 0;
            
            dataSourceDisp.textContent = bookData.source || 'Store Data Loaded';
            
            if (isRefresh) {
                showToast('Successfully refreshed data from Amazon Store!', 'success');
            }
        } catch (error) {
            console.error('Error fetching book details:', error);
            showToast(`Error: ${error.message}. Loaded offline cache.`, 'error');
            dataSourceDisp.textContent = 'Offline Fallback';
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Sets the loading UI states.
     * @param {boolean} isLoading True to show spinners/skeletons, false to show content
     */
    function setLoadingState(isLoading) {
        if (isLoading) {
            btnRefresh.disabled = true;
            refreshSpinner.style.display = 'inline-block';
            btnIcon.style.display = 'none';
            btnText.textContent = 'Refreshing...';
            
            bookSkeleton.style.display = 'block';
            bookContent.style.display = 'none';
            
            issuesGrid.innerHTML = `
                <div class="skeleton skeleton-img" style="height: 300px;"></div>
                <div class="skeleton skeleton-img" style="height: 300px;"></div>
                <div class="skeleton skeleton-img" style="height: 300px;"></div>
            `;
            alertsFeed.innerHTML = `
                <div class="skeleton skeleton-text" style="height: 80px; margin-top: 10px;"></div>
                <div class="skeleton skeleton-text" style="height: 80px; margin-top: 10px;"></div>
            `;
        } else {
            btnRefresh.disabled = false;
            refreshSpinner.style.display = 'none';
            btnIcon.style.display = 'inline-block';
            btnText.textContent = 'Refresh Details';
            
            bookSkeleton.style.display = 'none';
            bookContent.style.display = 'block';
        }
    }

    /**
     * Populates the left sidebar book detail card.
     * @param {object} data Scraped or cached book details JSON
     */
    function populateBookDetails(data) {
        document.getElementById('book-cover').src = data.cover_image_url || 'https://placehold.co/400x500';
        document.getElementById('book-cover').alt = data.title;
        
        // Stock status
        const stockBadge = document.getElementById('stock-badge');
        stockBadge.textContent = data.in_stock ? 'In Stock' : 'Out of Stock';
        if (data.in_stock) {
            stockBadge.classList.remove('out-of-stock');
        } else {
            stockBadge.classList.add('out-of-stock');
        }

        document.getElementById('book-title-disp').textContent = data.title;
        document.getElementById('book-author-disp').textContent = data.author;
        document.getElementById('book-rating-text').textContent = `${data.rating.split(' ')[0]} (${data.reviews_count} reviews)`;
        
        // Stars calculation
        const starsContainer = document.getElementById('book-rating-stars');
        starsContainer.innerHTML = '';
        const ratingVal = parseFloat(data.rating.split(' ')[0]) || 4.5;
        const fullStars = Math.floor(ratingVal);
        const hasHalf = ratingVal % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsContainer.innerHTML += '<i class="fa-solid fa-star"></i>';
            } else if (i === fullStars && hasHalf) {
                starsContainer.innerHTML += '<i class="fa-solid fa-star-half-stroke"></i>';
            } else {
                starsContainer.innerHTML += '<i class="fa-regular fa-star"></i>';
            }
        }

        document.getElementById('book-price-curr').textContent = data.current_price;
        document.getElementById('book-price-list').textContent = data.list_price;
        document.getElementById('book-discount').textContent = `-${data.discount}`;
        
        document.getElementById('book-publisher').textContent = data.publisher;
        document.getElementById('book-pub-date').textContent = data.publication_date;
        document.getElementById('book-isbn').textContent = data.isbn_13;
        document.getElementById('book-pages').textContent = data.pages;
        
        document.getElementById('book-description-text').textContent = data.description;
        document.getElementById('btn-amazon-store').href = data.amazon_product_url || 'https://www.amazon.com/dp/0714876789';
    }

    /**
     * Renders magazine issue cards under the Featured Issues tab.
     */
    function renderIssues() {
        if (!bookData || !bookData.magazine_issues) return;
        
        issuesGrid.innerHTML = '';
        
        // Filter and Search logic
        const filteredIssues = bookData.magazine_issues.filter(issue => {
            const matchesCategory = currentFilter === 'all' || issue.category === currentFilter;
            const matchesSearch = 
                issue.magazine.toLowerCase().includes(searchQuery) ||
                issue.photographer.toLowerCase().includes(searchQuery) ||
                issue.date.toLowerCase().includes(searchQuery) ||
                issue.cover_star.toLowerCase().includes(searchQuery) ||
                issue.significance.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (filteredIssues.length === 0) {
            issuesGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                    <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-muted);"></i>
                    <p>No magazine issues match your search criteria.</p>
                </div>
            `;
            return;
        }

        filteredIssues.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'issue-card';
            card.id = `card-${issue.id}`;
            
            card.innerHTML = `
                <div class="issue-cover-art cover-${issue.image_slug}">
                    <div class="cover-mag-name">${issue.magazine}</div>
                    <div class="cover-mag-date">${issue.date}</div>
                    <div class="cover-mag-credits">
                        <span>Cover By:</span> ${issue.photographer}
                    </div>
                </div>
                <div class="issue-card-info">
                    <span class="issue-card-tag">${issue.category}</span>
                    <h4 class="issue-card-significance">${issue.significance}</h4>
                    <p class="issue-card-commentary" title="${issue.commentary}">${issue.commentary}</p>
                    
                    <div class="issue-card-footer">
                        <div class="issue-photographer">
                            Featured: <strong>${issue.cover_star}</strong>
                        </div>
                        <div class="card-action-btns">
                            <button class="btn btn-secondary btn-icon-only btn-copy-issue" data-id="${issue.id}" title="Copy details to clipboard">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="btn btn-secondary btn-icon-only btn-email-issue" data-id="${issue.id}" title="Email details about this issue">
                                <i class="fa-solid fa-envelope"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            issuesGrid.appendChild(card);
        });

        // Set up email buttons event listeners
        document.querySelectorAll('.btn-email-issue').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const issueId = btn.getAttribute('data-id');
                const issue = bookData.magazine_issues.find(item => item.id === issueId);
                if (issue) {
                    sendEmailNotification({
                        type: `Magazine Issue Highlight (${issue.magazine})`,
                        title: `${issue.magazine} - ${issue.date} (Cover by ${issue.photographer})`,
                        details: `Featured Category: ${issue.category}\nCover Star: ${issue.cover_star}\n\nSignificance: ${issue.significance}\n\nVince Aletti Commentary:\n"${issue.commentary}"`
                    });
                }
            });
        });

        // Set up copy buttons event listeners
        document.querySelectorAll('.btn-copy-issue').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const issueId = btn.getAttribute('data-id');
                const issue = bookData.magazine_issues.find(item => item.id === issueId);
                if (issue) {
                    const textToCopy = `Magazine: ${issue.magazine} (${issue.date})\nCover By: ${issue.photographer}\nFeatured: ${issue.cover_star}\nCategory: ${issue.category}\nSignificance: ${issue.significance}\nCommentary: ${issue.commentary}`;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showToast(`Copied ${issue.magazine} details to clipboard!`, 'success');
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                        showToast('Failed to copy to clipboard', 'error');
                    });
                }
            });
        });
    }

    /**
     * Renders store update alerts under the Store Alerts tab.
     */
    function renderUpdates() {
        if (!bookData || !bookData.updates) return;
        
        alertsFeed.innerHTML = '';
        
        bookData.updates.forEach(update => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.id = `alert-${update.id}`;
            alertItem.setAttribute('data-type', update.type);
            
            // Map types to FontAwesome icons
            let iconClass = 'fa-solid fa-bell';
            if (update.type === 'Price Change') iconClass = 'fa-solid fa-tags';
            if (update.type === 'Stock Level') iconClass = 'fa-solid fa-boxes-stacked';
            if (update.type === 'Review') iconClass = 'fa-solid fa-star-half-stroke';
            if (update.type === 'Availability') iconClass = 'fa-solid fa-truck-ramp-box';

            // Format date relative or simplified
            const formattedTime = formatTimestamp(update.timestamp);

            alertItem.innerHTML = `
                <div class="alert-checkbox" aria-label="Select update alert">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="alert-icon-wrapper">
                    <i class="${iconClass}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-meta">
                        <span class="alert-type-badge">${update.type}</span>
                        <span class="alert-time">${formattedTime}</span>
                    </div>
                    <h4 class="alert-title">${update.title}</h4>
                    <p class="alert-details">${update.details}</p>
                    <div class="alert-action-row">
                        <button class="btn btn-secondary btn-email-alert" data-id="${update.id}">
                            <i class="fa-solid fa-paper-plane"></i> Email Update
                        </button>
                    </div>
                </div>
            `;
            
            // Click to toggle selection
            alertItem.addEventListener('click', (e) => {
                // Don't select if they clicked the email button directly
                if (e.target.closest('.btn-email-alert')) return;
                alertItem.classList.toggle('selected');
            });

            alertsFeed.appendChild(alertItem);
        });

        // Set up email buttons event listeners
        document.querySelectorAll('.btn-email-alert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const updateId = btn.getAttribute('data-id');
                const update = bookData.updates.find(item => item.id === updateId);
                if (update) {
                    sendEmailNotification({
                        type: `Store Update (${update.type})`,
                        title: update.title,
                        details: update.details
                    });
                }
            });
        });
    }

    /**
     * Sends a POST request to Flask backend to email a specific update.
     * @param {object} payload Details of the selected update
     */
    async function sendEmailNotification(payload) {
        showToast('Sending update to elena.dobrovolskaia.sqa@gmail.com...', 'info');
        
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (!response.ok && result.status !== 'error') {
                throw new Error(result.message || 'Failed to send email.');
            }

            // Populate Modal with results
            emailPreviewTo.textContent = result.recipient;
            emailPreviewSubject.textContent = result.subject;
            emailPreviewBody.innerHTML = result.email_body;
            
            if (result.status === 'simulated' || result.status === 'error') {
                emailSimAlert.style.display = 'flex';
                emailSuccessBanner.classList.remove('success-banner');
                emailSuccessBanner.style.background = 'rgba(245, 158, 11, 0.08)';
                emailSuccessBanner.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                emailSuccessBanner.querySelector('.status-icon').className = 'fa-solid fa-circle-info status-icon';
                emailSuccessBanner.querySelector('.status-icon').style.color = 'var(--warning)';
                
                emailStatusHeading.textContent = 'Email Send Simulated';
                emailStatusMessage.textContent = 'SMTP configuration is incomplete. The email content has been generated below.';
                
                clientSmtpRow.style.display = 'flex';
                emailPreviewSmtp.textContent = `${result.smtp_server}:${result.smtp_port}`;
                
                showToast('Email preview generated (Simulation Mode).', 'info');
            } else {
                emailSimAlert.style.display = 'none';
                emailSuccessBanner.classList.add('success-banner');
                emailSuccessBanner.style.background = 'rgba(16, 185, 129, 0.08)';
                emailSuccessBanner.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                emailSuccessBanner.querySelector('.status-icon').className = 'fa-solid fa-circle-check status-icon';
                emailSuccessBanner.querySelector('.status-icon').style.color = 'var(--success)';
                
                emailStatusHeading.textContent = 'Email Sent Successfully!';
                emailStatusMessage.textContent = 'The selected update has been dispatched to elena.dobrovolskaia.sqa@gmail.com.';
                
                clientSmtpRow.style.display = 'none';
                
                showToast('Email successfully sent!', 'success');
            }

            // Open Modal
            emailModal.style.display = 'flex';

        } catch (error) {
            console.error('SMTP/API error sending email:', error);
            showToast(`SMTP Error: Unable to send email. Check console log.`, 'error');
        }
    }

    /**
     * Formats an ISO timestamp into a user-friendly date string.
     * @param {string} isoString ISO date time format
     */
    function formatTimestamp(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return isoString;
        }
    }

    /**
     * Displays a dynamic floating toast notification.
     * @param {string} msg Text to display
     * @param {string} type Theme 'success', 'error', 'info'
     */
    function showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-solid fa-circle-check';
        if (type === 'error') icon = 'fa-solid fa-circle-exclamation';
        if (type === 'info') icon = 'fa-solid fa-circle-info';

        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${msg}</span>
        `;
        
        container.appendChild(toast);
        
        // Animate out and remove
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.checked = true;
    }
    
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            showToast('Switched to light mode', 'info');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            showToast('Switched to dark mode', 'info');
        }
    });

    // CSV Export Logic
    const btnExportCsv = document.getElementById('btn-export-csv');
    btnExportCsv.addEventListener('click', () => {
        if (!bookData || !bookData.magazine_issues) {
            showToast('No data to export', 'error');
            return;
        }
        
        const filteredIssues = bookData.magazine_issues.filter(issue => {
            const matchesCategory = currentFilter === 'all' || issue.category === currentFilter;
            const matchesSearch = 
                issue.magazine.toLowerCase().includes(searchQuery) ||
                issue.photographer.toLowerCase().includes(searchQuery) ||
                issue.date.toLowerCase().includes(searchQuery) ||
                issue.cover_star.toLowerCase().includes(searchQuery) ||
                issue.significance.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (filteredIssues.length === 0) {
            showToast('No filtered issues to export', 'error');
            return;
        }

        const headers = ['ID', 'Magazine', 'Date', 'Photographer', 'Cover Star', 'Category', 'Significance', 'Commentary'];
        const csvRows = [headers.join(',')];

        filteredIssues.forEach(issue => {
            const values = [
                issue.id,
                issue.magazine,
                issue.date,
                issue.photographer,
                issue.cover_star,
                issue.category,
                issue.significance,
                issue.commentary
            ].map(val => {
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });

        // Use encodeURIComponent to support special characters and quotes correctly
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(row => encodeURIComponent(row)).join("%0A");
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `issues_export_${currentFilter}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exported ${filteredIssues.length} issues to CSV!`, 'success');
    });

    // Subscription Logic
    const subscribeForm = document.getElementById('subscribe-form');
    const subscribeEmail = document.getElementById('subscribe-email');
    const btnSubscribe = document.getElementById('btn-subscribe');

    subscribeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = subscribeEmail.value.trim();
        if (!email) return;

        btnSubscribe.disabled = true;
        showToast('Subscribing...', 'info');

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Subscription failed.');
            }

            if (result.status === 'already_subscribed') {
                showToast(result.message, 'info');
                subscribeEmail.value = '';
                return;
            }

            // If simulated, open the preview modal
            if (result.status === 'simulated' || result.status === 'error') {
                emailPreviewTo.textContent = result.recipient;
                emailPreviewSubject.textContent = result.subject;
                emailPreviewBody.innerHTML = result.email_body;

                emailSimAlert.style.display = 'flex';
                emailSuccessBanner.classList.remove('success-banner');
                emailSuccessBanner.style.background = 'rgba(245, 158, 11, 0.08)';
                emailSuccessBanner.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                emailSuccessBanner.querySelector('.status-icon').className = 'fa-solid fa-circle-info status-icon';
                emailSuccessBanner.querySelector('.status-icon').style.color = 'var(--warning)';

                emailStatusHeading.textContent = 'Confirmation Email (Simulated)';
                emailStatusMessage.textContent = 'Subscription added to DB! Showing confirmation email preview below.';

                clientSmtpRow.style.display = 'flex';
                emailPreviewSmtp.textContent = `${result.smtp_server}:${result.smtp_port}`;

                emailModal.style.display = 'flex';
                showToast('Subscribed! Confirmation preview generated.', 'success');
            } else {
                showToast(`Subscribed successfully! Confirmation email sent to ${email}.`, 'success');
            }

            subscribeEmail.value = '';
        } catch (error) {
            console.error('Subscription error:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            btnSubscribe.disabled = false;
        }
    });
});

