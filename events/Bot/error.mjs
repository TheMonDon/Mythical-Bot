export async function run(client, error) {
  const string = JSON.stringify(error);
  if (string.length === 2) {
    console.log(error);
    return client.logger.error(string);
  }

  return client.logger.error(string);
}
