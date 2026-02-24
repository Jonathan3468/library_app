// imageStorage.js — save/load images in localStorage by entity type + id

const KEY = (type, id) => `img_${type}_${id}`;

export const saveImage = (type, id, dataUrl) => {
  if (!dataUrl) {
    localStorage.removeItem(KEY(type, id));
  } else {
    try {
      localStorage.setItem(KEY(type, id), dataUrl);
    } catch (e) {
      console.warn("localStorage full, could not save image:", e);
    }
  }
};

export const loadImage = (type, id) => {
  return localStorage.getItem(KEY(type, id)) || "";
};

export const removeImage = (type, id) => {
  localStorage.removeItem(KEY(type, id));
};

// Usage examples:
// saveImage("book", 1, base64string)
// loadImage("book", 1)
// saveImage("author", 5, base64string)
// saveImage("publication", 3, base64string)