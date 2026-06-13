/* AB360WEB Admin — rich text editor helpers */
(function () {
  /* Toolbar buttons */
  document.querySelectorAll('.rt-bar button[data-cmd]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cmd = btn.dataset.cmd;
      var rt = btn.closest('label').querySelector('.rt');
      if (rt) rt.focus();
      if (cmd === 'createLink') {
        var url = prompt('Link URL (https://…):');
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.dataset.val || 'p');
      } else {
        document.execCommand(cmd, false, null);
      }
    });
  });

  /* Sync contenteditable → hidden textarea on submit */
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function () {
      form.querySelectorAll('.rt').forEach(function (rt) {
        var ta = rt.closest('label').querySelector('textarea[hidden]');
        if (ta) ta.value = rt.innerHTML;
      });
    });
  });
})();
