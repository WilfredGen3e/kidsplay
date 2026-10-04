import './style.css';
import { registerGame } from './platform/registry';
import { dummyGame } from './games/dummy';

registerGame(dummyGame);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.textContent = 'Familiespellen';
