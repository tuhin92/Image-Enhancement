from flask import Flask, request, send_file, jsonify
import os
from hybrid import hybrid_enhance

app = Flask(__name__)

@app.route('/enhance', methods=['POST'])
def enhance():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    file = request.files['image']
    input_path = '/tmp/input.jpg'
    output_path = '/tmp/output.jpg'
    file.save(input_path)

    # Get parameters from form or JSON
    gamma = float(request.form.get('gamma', 1.0))
    max_gain = float(request.form.get('max_gain', 5.0))
    denoise_strength = int(request.form.get('denoise_strength', 10))
    saturation_scale = float(request.form.get('saturation_scale', 1.0))

    success = hybrid_enhance(input_path, output_path, gamma=gamma, max_gain=max_gain, denoise_strength=denoise_strength, saturation_scale=saturation_scale)
    if not success or not os.path.exists(output_path):
        return jsonify({'error': 'Enhancement failed'}), 500
    return send_file(output_path, mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000) 