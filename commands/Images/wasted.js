const Command = require('../../base/Command.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

class Wasted extends Command {
  constructor(client) {
    super(client, {
      name: 'wasted',
      description: "Displays you or the mentioned user's avatar with the GTA V Wasted overlay.",
      category: 'Images',
      usage: 'wasted [user]',
    });
  }

  async run(msg, args) {
    let infoMem; // Will store the GuildMember or User object
    let fetchedUser; // Will store the User object

    // If text is provided, try to get the member from the guild
    if (args?.length > 0) {
      infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());
    } else {
      infoMem = msg.member;
    }

    if (!infoMem) {
      // If no member is found, try to fetch the user by ID
      const findId = args.join(' ').toLowerCase().replace(/<@|>/g, '');

      try {
        // Fetch the user object using the ID
        fetchedUser = await this.client.users.fetch(findId, { force: true });
      } catch (err) {
        // If the user cannot be fetched, default to the message author
        infoMem = msg.member; // Use the message author's member object
        fetchedUser = infoMem.user; // Get the User object from the member
      }
    } else {
      // If a member is found in the guild, fetch their user object
      fetchedUser = infoMem.user;
    }

    // Fetch the user's avatar as a PNG
    const avatarURL = fetchedUser.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });

    // Generate the image
    try {
      const avatar = await loadImage(avatarURL);
      const canvas = createCanvas(400, 400);
      const ctx = canvas.getContext('2d');

      // Draw the avatar
      ctx.drawImage(avatar, 0, 0, 400, 400);

      // Apply grayscale
      const imageData = ctx.getImageData(0, 0, 400, 400);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = grayscale; // Red
        data[i + 1] = grayscale; // Green
        data[i + 2] = grayscale; // Blue
      }
      ctx.putImageData(imageData, 0, 0);

      // Apply a very subtle blur
      ctx.globalAlpha = 0.9; // Slight transparency for layering
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          if (i !== 0 || j !== 0) {
            ctx.drawImage(canvas, i, j);
          }
        }
      }
      ctx.globalAlpha = 1.0; // Reset transparency

      // Load and draw the "WASTED" banner
      const wastedPath = path.resolve(__dirname, '../../resources/images/Wasted.png');
      const wasted = await loadImage(wastedPath);
      ctx.drawImage(wasted, 0, 100, 400, 200);

      // Send the result
      const attachment = canvas.toBuffer();
      await msg.channel.send({
        files: [{ attachment, name: 'wasted.png' }],
      });
    } catch (error) {
      this.client.logger.error(error.stack);
      msg.reply('There was an error processing the image.');
    }
  }
}

module.exports = Wasted;
