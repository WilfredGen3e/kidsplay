import { el, textButton } from '../ui/dom';

export interface Sum {
  a: number;
  b: number;
  answer: number;
}

/** Een tafelsom die een kind van 4–10 niet zomaar kan: beide getallen van 6 t/m 9. */
export function newSum(random: () => number = Math.random): Sum {
  const a = 6 + Math.floor(random() * 4);
  const b = 6 + Math.floor(random() * 4);
  return { a, b, answer: a * b };
}

/** Rekensom met cijfertoetsen. Roept `onPass` bij een goed antwoord; ✗ of een fout antwoord geeft een nieuwe som. */
export function showParentCheck(root: HTMLElement, onPass: () => void, onCancel: () => void): void {
  const screen = el('main', 'screen check-screen');
  const card = el('div', 'check-card');
  const question = el('div', 'check-question');
  const display = el('div', 'check-display');
  const note = el('div', 'check-note', 'Ouders: los de som op');
  let sum = newSum();
  let input = '';

  const refresh = () => {
    question.textContent = `${sum.a} × ${sum.b} = ?`;
    display.textContent = input || ' ';
  };

  const submit = () => {
    if (Number(input) === sum.answer) {
      onPass();
      return;
    }
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    sum = newSum();
    input = '';
    refresh();
  };

  const pad = el('div', 'keypad');
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']) {
    pad.append(
      textButton(key, `key${key === '✓' ? ' key-ok' : ''}`, () => {
        if (key === '⌫') input = input.slice(0, -1);
        else if (key === '✓') return submit();
        else if (input.length < 3) input += key;
        refresh();
      }),
    );
  }

  const cancel = textButton('✗', 'corner-button check-cancel', onCancel);
  cancel.setAttribute('aria-label', 'Terug');
  card.append(note, question, display, pad);
  screen.append(card, cancel);
  root.replaceChildren(screen);
  refresh();
}
