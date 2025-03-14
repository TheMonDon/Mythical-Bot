const Command = require('../../base/Command.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

class Wanted extends Command {
  constructor(client) {
    super(client, {
      name: 'wanted',
      description: "Displays you or the mentioned user's avatar with on a wanted poster",
      category: 'Images',
      usage: 'wanted [user]',
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
      // Load the avatar and the background image
      const avatar = await loadImage(avatarURL);
      const backgroundPath = path.resolve(__dirname, '../../resources/images/wanted_poster.jpg');
      const background = await loadImage(backgroundPath);

      // Create a canvas with the dimensions of the background
      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');

      // Draw the background
      ctx.drawImage(background, 0, 0);

      // Resize and position the avatar
      const avatarWidth = 400;
      const avatarHeight = 400;
      const avatarX = 170; // X-coordinate
      const avatarY = 305; // Y-coordinate
      ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight);

      // Send the result
      const attachment = canvas.toBuffer();
      await msg.channel.send({
        files: [{ attachment, name: 'custom_avatar.png' }],
      });
    } catch (error) {
      this.client.logger.error(error.stack);
      msg.reply('There was an error processing the image.');
    }
  }
}

module.exports = Wanted;
