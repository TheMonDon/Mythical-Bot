const Command = require('../../base/Command.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

class LGBT extends Command {
  constructor(client) {
    super(client, {
      name: 'lgbt',
      description: "Displays you or the mentioned user's avatar with the LGBT overlay.",
      category: 'Images',
      usage: 'lgbt [user]',
    });
  }

  async run(msg, args) {
    let infoMem;

    if (args?.length > 0) {
      // Try to fetch the member from the provided text
      infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());
    }

    if (!infoMem) {
      // If no member is found, attempt to fetch the user by ID
      const findId = args?.join(' ').toLowerCase().replace(/<@|>/g, '');
      if (findId) {
        try {
          infoMem = await this.client.users.fetch(findId, { force: true });
        } catch (_) {}
      }
    }

    // Default to the author if no user/member is found
    if (!infoMem) {
      infoMem = msg.guild ? msg.member : msg.author;
    }

    // Get the user object
    const fetchedUser = infoMem.user || infoMem;

    // Fetch the user's avatar as a PNG
    const avatarURL = fetchedUser.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });

    // Generate the image
    try {
      const avatar = await loadImage(avatarURL);
      const canvas = createCanvas(400, 400);
      const ctx = canvas.getContext('2d');

      // Draw the avatar
      ctx.drawImage(avatar, 0, 0, 400, 400);

      // Load and draw the "WASTED" banner
      const rainbowPath = path.resolve(__dirname, '../../resources/images/rainbow.png');
      const rainbow = await loadImage(rainbowPath);
      ctx.drawImage(rainbow, 0, 0, 400, 400);

      // Send the result
      const attachment = canvas.toBuffer();
      await msg.channel.send({
        files: [{ attachment, name: 'lgbt.png' }],
      });
    } catch (error) {
      this.client.logger.error(error.stack);
      msg.reply('There was an error processing the image.');
    }
  }
}

module.exports = LGBT;
