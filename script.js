
class JobListingsApp {
  constructor() {
    this.jobs = [];
    this.activeFilters = [];
    this.filterContainer = document.getElementById('filter-container');
    this.filterList = document.getElementById('filter-list');
    this.clearFiltersBtn = document.getElementById('clear-filters');
    this.jobList = document.getElementById('job-list');
    
    this.init();
  }

  async init() {
    try {
      await this.loadJobData();
      this.renderJobs();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load job listings. Please try again later.');
    }
  }

  async loadJobData() {
    try {
      const response = await fetch('./data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.jobs = await response.json();
    } catch (error) {
      console.error('Error loading job data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
    
    // Keyboard navigation for filters
    this.filterList.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.target.classList.contains('filter-tag__remove')) {
          e.target.click();
        }
      }
    });

    // Job card interactions
    this.jobList.addEventListener('click', (e) => {
      if (e.target.classList.contains('job-card__tag')) {
        this.addFilter(e.target.textContent.trim());
      }
    });

    this.jobList.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('job-card__tag')) {
        e.preventDefault();
        this.addFilter(e.target.textContent.trim());
      }
    });
  }

  renderJobs() {
    const filteredJobs = this.getFilteredJobs();
    
    if (filteredJobs.length === 0) {
      this.jobList.innerHTML = `
        <div class="no-results" role="status" aria-live="polite">
          <p>No job listings match your current filters.</p>
        </div>
      `;
      return;
    }

    this.jobList.innerHTML = filteredJobs
      .map(job => this.createJobCard(job))
      .join('');

    // Implement lazy loading for logos
    this.setupLazyLoading();
    
    // Announce results to screen readers
    this.announceResults(filteredJobs.length);
  }

  createJobCard(job) {
    const { 
      id, company, logo, position, role, level, postedAt, 
      contract, location, languages, tools, featured, new: isNew 
    } = job;

    const allTags = [role, level, ...languages, ...tools];
    const badges = [];
    
    if (isNew) badges.push('<span class="job-card__badge job-card__badge--new">New!</span>');
    if (featured) badges.push('<span class="job-card__badge job-card__badge--featured">Featured</span>');

    return `
      <article class="job-card ${featured ? 'job-card--featured' : ''}" data-job-id="${id}">
        <div class="job-card__header">
          <img 
            src="${logo}" 
            alt="${company} logo" 
            class="job-card__logo"
            loading="lazy"
            onerror="this.style.display='none'"
          >
          <div class="job-card__company-info">
            <div class="job-card__company-header">
              <span class="job-card__company">${company}</span>
              ${badges.join('')}
            </div>
            <h2 class="job-card__position" tabindex="0" role="button" aria-label="View ${position} position at ${company}">
              ${position}
            </h2>
            <div class="job-card__details">
              <span class="job-card__detail">${postedAt}</span>
              <span class="job-card__detail">${contract}</span>
              <span class="job-card__detail">${location}</span>
            </div>
          </div>
        </div>
        
        <hr class="job-card__divider" aria-hidden="true">
        
        <div class="job-card__tags" role="list" aria-label="Job requirements and technologies">
          ${allTags.map(tag => `
            <button 
              class="job-card__tag" 
              type="button"
              role="listitem"
              aria-label="Filter by ${tag}"
            >
              ${tag}
            </button>
          `).join('')}
        </div>
      </article>
    `;
  }

  getFilteredJobs() {
    if (this.activeFilters.length === 0) {
      return this.jobs;
    }

    return this.jobs.filter(job => {
      const jobTags = [job.role, job.level, ...job.languages, ...job.tools];
      return this.activeFilters.every(filter => 
        jobTags.some(tag => tag.toLowerCase() === filter.toLowerCase())
      );
    });
  }

  addFilter(filterValue) {
    const normalizedFilter = filterValue.trim();
    
    if (!this.activeFilters.includes(normalizedFilter)) {
      this.activeFilters.push(normalizedFilter);
      this.updateFilterDisplay();
      this.renderJobs();
      
      // Announce filter addition to screen readers
      this.announceFilterChange(`Added filter: ${normalizedFilter}`);
    }
  }

  removeFilter(filterValue) {
    this.activeFilters = this.activeFilters.filter(filter => filter !== filterValue);
    this.updateFilterDisplay();
    this.renderJobs();
    
    // Announce filter removal to screen readers
    this.announceFilterChange(`Removed filter: ${filterValue}`);
  }

  clearAllFilters() {
    this.activeFilters = [];
    this.updateFilterDisplay();
    this.renderJobs();
    
    // Announce clearing of filters to screen readers
    this.announceFilterChange('All filters cleared');
  }

  updateFilterDisplay() {
    if (this.activeFilters.length === 0) {
      this.filterContainer.style.display = 'none';
      return;
    }

    this.filterContainer.style.display = 'flex';
    this.filterList.innerHTML = this.activeFilters
      .map(filter => `
        <div class="filter-tag" role="listitem">
          <span class="filter-tag__text">${filter}</span>
          <button 
            class="filter-tag__remove" 
            type="button"
            aria-label="Remove ${filter} filter"
            data-filter="${filter}"
          >
            <img src="./icon-remove.svg" alt="" aria-hidden="true">
          </button>
        </div>
      `).join('');

    // Add event listeners to remove buttons
    this.filterList.querySelectorAll('.filter-tag__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterValue = e.target.closest('.filter-tag__remove').dataset.filter;
        this.removeFilter(filterValue);
      });
    });
  }

  setupLazyLoading() {
    const images = this.jobList.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.src; // Trigger loading
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  announceResults(count) {
    const announcement = `Showing ${count} job listing${count !== 1 ? 's' : ''}`;
    this.announceToScreenReader(announcement);
  }

  announceFilterChange(message) {
    this.announceToScreenReader(message);
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  showError(message) {
    this.jobList.innerHTML = `
      <div class="error-message" role="alert">
        <h2>Error</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="retry-btn">
          Try Again
        </button>
      </div>
    `;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new JobListingsApp();
});

// Handle potential service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
