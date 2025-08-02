from flask import Flask, request, send_file, jsonify
import os
from lime_enhance import lime_enhance

app = Flask(__name__)

@app.route('/enhance', methods=['POST'])
def enhance():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    file = request.files['image']
    input_path = '/tmp/input.jpg'
    output_path = '/tmp/output.jpg'
    file.save(input_path)
    success = lime_enhance(input_path, output_path)
    if not success or not os.path.exists(output_path):
        return jsonify({'error': 'Enhancement failed'}), 500
    return send_file(output_path, mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000) 