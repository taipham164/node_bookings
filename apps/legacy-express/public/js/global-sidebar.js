// Global Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar-info');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('sidebar-toggle-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  function openSidebar() {
    sidebar.style.right = '0';
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.style.right = '-400px';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Initialize sidebar state
  closeSidebar();

  // Event listeners
  if (openBtn) {
    openBtn.addEventListener('click', openSidebar);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
  }
  
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Close sidebar on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSidebar();
    }
  });

  // Close sidebar on window resize if screen becomes large
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 1200) {
      closeSidebar();
    }
  });
});
