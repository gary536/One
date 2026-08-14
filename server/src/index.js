import { PORT } from './config.js';
import app from './app.js';

app.listen(PORT, () => {
  console.log(`後端 API 已啟動: http://localhost:${PORT}`);
});
