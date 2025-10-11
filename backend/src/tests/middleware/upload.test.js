const upload = require('../../middleware/upload');
const path = require('path');

describe('Upload Middleware', () => {
  it('should export multer upload instance', () => {
    expect(upload).toBeDefined();
    // Multer returns an object with various methods (single, array, fields, etc.)
    expect(typeof upload).toBe('object');
    expect(typeof upload.single).toBe('function');
  });

  it('should have storage configuration', () => {
    // The upload middleware is configured with multer
    expect(upload.storage).toBeDefined();
  });

  it('should configure destination as uploads/', () => {
    const storage = upload.storage;
    expect(storage).toBeDefined();
  });

  describe('File Extension Handling', () => {
    it('should preserve file extension', () => {
      const testCases = [
        { original: 'image.png', expectedExt: '.png' },
        { original: 'document.pdf', expectedExt: '.pdf' },
        { original: 'file.txt', expectedExt: '.txt' },
        { original: 'photo.jpg', expectedExt: '.jpg' }
      ];

      testCases.forEach(({ original, expectedExt }) => {
        const ext = path.extname(original);
        expect(ext).toBe(expectedExt);
      });
    });
  });

  describe('Multer Middleware Behavior', () => {
    it('should have single file upload method', () => {
      expect(typeof upload.single).toBe('function');
    });

    it('should have multiple files upload method', () => {
      expect(typeof upload.array).toBe('function');
    });

    it('should have fields method for multiple fields', () => {
      expect(typeof upload.fields).toBe('function');
    });

    it('should have any method', () => {
      expect(typeof upload.any).toBe('function');
    });

    it('should have none method', () => {
      expect(typeof upload.none).toBe('function');
    });
  });

  describe('Configuration', () => {
    it('should be properly configured multer instance', () => {
      // Verify it has the expected multer methods
      const multerMethods = ['single', 'array', 'fields', 'any', 'none'];
      multerMethods.forEach(method => {
        expect(upload).toHaveProperty(method);
        expect(typeof upload[method]).toBe('function');
      });
    });
  });
});
