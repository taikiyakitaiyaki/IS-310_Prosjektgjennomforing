const memberCards = document.querySelectorAll('.member-card');
const studentModal = document.getElementById('studentModal');
const modalTitle = document.getElementById('studentModalTitle');
const modalRole = document.getElementById('studentModalRole');
const modalBio = document.getElementById('studentModalBio');
const modalDetail = document.getElementById('studentModalDetail');
const modalHeader = document.getElementById('studentModalHeader');
const modalClose = document.querySelector('.modal-close');

const openModal = (card) => {
  const name = card.dataset.name || 'Student';
  const role = card.dataset.role || 'Faglig fokus';
  const bio = card.dataset.bio || 'Kort beskrivelse.';
  const detail = card.dataset.detail || 'Mer informasjon om personen.';
  const color = card.dataset.color || '#9b9eff';

  modalTitle.textContent = name;
  modalRole.textContent = role;
  modalBio.textContent = bio;
  modalDetail.textContent = detail;
  modalHeader.style.background = `linear-gradient(135deg, ${color}33, rgba(255,255,255,0.1))`;

  studentModal.classList.add('open');
  studentModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  studentModal.classList.remove('open');
  studentModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

memberCards.forEach((card) => {
  card.addEventListener('click', () => openModal(card));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openModal(card);
    }
  });
});

modalClose.addEventListener('click', closeModal);
studentModal.addEventListener('click', (event) => {
  if (event.target.dataset.close === 'true' || event.target === studentModal) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && studentModal.classList.contains('open')) {
    closeModal();
  }
});
