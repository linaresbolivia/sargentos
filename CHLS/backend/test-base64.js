const { MessageMedia } = require('whatsapp-web.js');
console.log('MessageMedia required successfully');
const media = new MessageMedia('image/jpeg', 'ASDF', 'image.jpg');
console.log('media created:', media);
