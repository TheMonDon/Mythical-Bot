const Command = require('../../base/Command.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

class YesNo extends Command {
  constructor(client) {
    super(client, {
      name: 'yesno',
      description: "Displays the author's and the mentioned user's avatars on a Yes/No background.",
      category: 'Images',
      usage: 'yesno <user>',
      requiredArgs: 1,
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

    // Fetch author and target user avatars
    const authorAvatarURL = msg.author.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });
    const targetAvatarURL = fetchedUser.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });

    try {
      // Load the avatars and background
      const authorAvatar = await loadImage(authorAvatarURL);
      const targetAvatar = await loadImage(targetAvatarURL);
      const backgroundPath = path.resolve(__dirname, '../../resources/images/yesno.png');
      const background = await loadImage(backgroundPath);

      // Create a canvas with the dimensions of the background
      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');

      // Draw the background
      ctx.drawImage(background, 0, 0);

      // Resize and draw the avatars (swapped positions)
      const avatarWidth = 500;
      const avatarHeight = 500;

      // Target user's avatar (top position)
      const targetAvatarX = 870;
      const targetAvatarY = 15;
      ctx.drawImage(targetAvatar, targetAvatarX, targetAvatarY, avatarWidth, avatarHeight);

      // Author's avatar (bottom position)
      const authorAvatarX = 870;
      const authorAvatarY = 560;
      ctx.drawImage(authorAvatar, authorAvatarX, authorAvatarY, avatarWidth, avatarHeight);

      // Send the result
      const attachment = canvas.toBuffer();
      await msg.channel.send({
        files: [{ attachment, name: 'yesno_result.png' }],
      });
    } catch (error) {
      this.client.logger.error(error.stack);
      msg.reply('There was an error processing the image.');
    }
  }
}

module.exports = YesNo;
