
document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.password-toggle i').forEach(toggle => {
    const field = toggle.closest('.form-group').querySelector('input[type="password"], input[type="text"]');
    toggle.addEventListener('click', () => {
      if (field.type === 'password') {
        field.type = 'text';
        toggle.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        field.type = 'password';
        toggle.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  });

  document.body.addEventListener('click', e => {
    if (e.target.matches('.alert-close')) {
      const alertBox = e.target.closest('.auth-alert');
      alertBox.classList.remove('alert-show');
      setTimeout(() => alertBox.remove(), 300);
    }
  });



  
});
