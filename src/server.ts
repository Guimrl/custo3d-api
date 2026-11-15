import "dotenv/config";
import app from "./main";

const port = process.env.PORT || 3333;

app.listen(port, () => {
  console.log(`server listening on port: ${port}`);
});

export default app;
